# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""Megatron initialization."""

import os
import random
import time
from datetime import timedelta

import deepspeed
import numpy as np
import torch
from deepspeed.accelerator import get_accelerator

from megatron import fused_kernels, get_adlr_autoresume, get_args
from megatron.arguments import parse_args, validate_args
from megatron.checkpointing import load_args_from_checkpoint
from megatron.core import mpu, tensor_parallel
from megatron.global_vars import set_global_variables
from megatron.model.fused_bias_gelu import bias_gelu
from megatron.model.transformer import bias_dropout_add_fused_train


def initialize_megatron(
    extra_args_provider=None,
    args_defaults={},
    ignore_unknown_args=False,
    allow_no_cuda=False,
):
    """Set global variables, initialize distributed, and
    set autoresume and random seeds.
    `allow_no_cuda` should not be set unless using megatron for cpu only
    data processing. In general this arg should not be set unless you know
    what you are doing.
    Returns a function to finalize distributed env initialization
    (optionally, only when args.lazy_mpu_init == True)
    """
    if not allow_no_cuda:
        # Make sure cuda is available.
        assert get_accelerator().is_available(), "Megatron requires CUDA."

    # Parse arguments
    args = parse_args(extra_args_provider, ignore_unknown_args)

    if args.use_checkpoint_args or args_defaults.get("use_checkpoint_args", False):
        assert args.load is not None, "--use-checkpoints-args requires --load argument"
        load_args_from_checkpoint(args)

    validate_args(args, args_defaults)

    # set global args, build tokenizer, and set adlr-autoresume,
    # and timers.
    set_global_variables(args)

    # torch.distributed initialization
    def finish_mpu_init():
        args = get_args()
        # Pytorch distributed.
        _initialize_distributed()

        # Random seeds for reproducibility.
        print_rank_0(f">Setting random seeds to {args.seed}...")
        _set_random_seed(args.seed, args.data_parallel_random_init)

    args = get_args()
    if args.lazy_mpu_init:
        # TODO: is this still a necessary option?
        args.use_cpu_initialization = True
        # delayed initialization of DDP-related stuff
        # We only set basic DDP globals
        mpu.set_tensor_model_parallel_world_size(args.tensor_model_parallel_size)
        # and return function for external DDP manager
        # to call when it has DDP initialized
        mpu.set_tensor_model_parallel_rank(args.rank)
        return finish_mpu_init
    else:
        # Megatron's MPU is the master. Complete initialization right away.
        finish_mpu_init()

        # Autoresume.
        _init_autoresume()

        # Compile dependencies.
        _compile_dependencies()

        # No continuation function
        return None


def _compile_dependencies():
    args = get_args()

    # Compile dataset C++ code.
    # TODO: move this to ninja
    if is_rank_0():
        start_time = time.time()
        print(">Compiling dataset index builder...")
        from megatron.data.dataset_utils import compile_helper

        compile_helper()
        print(
            f">>>Done with dataset index builder. Compilation time: {time.time() - start_time:.3f}"
        )

    # Load fused kernels

    # Custom kernel constraints check.
    seq_len = args.seq_length
    attn_batch_size = (
        args.num_attention_heads / args.tensor_model_parallel_size
    ) * args.micro_batch_size
    # Constraints on sequence length and attn_batch_size to enable warp based
    # optimization and upper triangular optimization (for causal mask)
    custom_kernel_constraint = (
        seq_len > 16
        and seq_len <= 4096
        and seq_len % 4 == 0
        and attn_batch_size % 4 == 0
    )
    # Print a warning.
    if (
        not (args.fp16 or args.bf16)
        and custom_kernel_constraint
        and args.masked_softmax_fusion
    ):
        print_rank_0(
            "WARNING: Constraints for invoking optimized \
                fused softmax kernel are not met. We default back to \
                unfused kernel invocations."
        )

    # Always build on rank zero first.
    if is_rank_0():
        start_time = time.time()
        print(">Compiling and loading fused kernels...", flush=True)
        fused_kernels.load(args)
        torch.distributed.barrier()
    else:
        torch.distributed.barrier()
        fused_kernels.load(args)
    # Simple barrier to make sure all ranks have passed the
    # compilation phase successfully before moving on to the
    # rest of the program. We think this might ensure that
    # the lock is released.
    torch.distributed.barrier()
    print_rank_0(
        f">>>Done compiling and loading fused kernels. \
        Compilation time: {time.time() - start_time:.3f} seconds"
    )


def _initialize_distributed():
    """Initialize torch.distributed and core model parallel."""
    args = get_args()

    device_count = get_accelerator().device_count()
    if torch.distributed.is_initialized():
        print_rank_0(
            "torch.distributed is already initialized, skipping initialization..."
        )
        args.rank = torch.distributed.get_rank()
        args.world_size = torch.distributed.get_world_size()
    else:
        print_rank_0(">Initializing torch.distributed...")
        # Manually set the device ids.
        if device_count > 0:
            device = args.rank % device_count
            if args.local_rank is not None:
                assert (
                    args.local_rank == device
                ), "expected local-rank to be the same as rank % device-count."
            else:
                args.local_rank = device
            get_accelerator().set_device(device)

    # Call the init process
    if args.deepseed or args.deepspeed_inference:
        deepspeed.init_distributed()
    else:
        torch.distributed.init_process_group(
            backend=args.distributed_backend,
            world_size=args.world_size,
            rank=args.rank,
            timeout=timedelta(minutes=10),
        )

    # Set the tensor model-parallel, pipeline model-parallel, and
    # data-parallel communicators.
    if device_count > 0:
        if mpu.model_parallel_is_initialized():
            print_rank_0("Model parallel already initialized.")
        else:
            mpu.initialize_model_parallel(
                args.tensor_model_parallel_size,
                args.pipeline_model_parallel_size,
                args.virtual_pipeline_model_parallel_size,
                args.pipeline_model_parallel_split_rank,
            )
            print_rank_0(
                f">Initialized tensor model parallel with size \
                    {mpu.get_tensor_model_parallel_world_size()}"
            )
            print_rank_0(
                f">Initialized pipeline model parallel with size \
                    {mpu.get_pipeline_model_parallel_world_size()}"
            )

    if args.deepspeed and args.deepspeed_activation_checkpointing:
        setup_deepspeed_checkpointing(args)


def setup_deepspeed_checkpointing(args):
    """DeepSpeed Activation Checkpointing.
    Gives access to partition activations, contiguous memory optimizations
    and cpu checkpointing.
    Activation checkpoint requires keep track of the random states
    and setting the random seed for each MP process. Megatron uses
    mpu.get_cuda_rng_tracker and mpu.model_parallel_cuda_manual_seed
    for keeping track of the random states and setting the random seeds.
    Since they are used in places outside of activation checkpointing,
    we overwrite them to maintain consistency.
    This must be called before all the calls to mpu.model_parallel_cuda_manual_seed
    """
    num_layers = args.num_layers // args.checkpoint_num_layers
    num_layers = (
        num_layers
        if args.num_layers % args.checkpoint_num_layers == 0
        else num_layers + 1
    )
    if args.split_transformers:
        num_layers *= 2

    print_rank_0(">Configuring DeepSpeed checkpointing...")
    deepspeed.checkpointing.configure(
        mpu,
        partition_activations=args.partition_activations,
        contiguous_checkpointing=args.contigious_checkpointing,
        num_checkpoints=num_layers,
        checkpoint_in_cpu=args.checkpoint_in_cpu,
        synchronize=args.synchronize_each_layer,
        profile=args.profile_backward,
    )

    mpu.checkpoint = deepspeed.checkpointing.checkpoint
    mpu.get_cuda_rng_tracker = deepspeed.checkpointing.get_cuda_rng_tracker
    mpu.model_parallel_cuda_manual_seed = (
        deepspeed.checkpointing.model_parallel_cuda_manual_seed
    )


def _init_autoresume():
    """Set autoresume start time."""
    autoresume = get_adlr_autoresume()
    if autoresume:
        torch.distributed.barrier()
        autoresume.init()
        torch.distributed.barrier()


def _set_random_seed(seed_, data_parallel_random_init=False):
    """Set random seed for reproducability."""
    if seed_ is not None and seed_ > 0:
        # Ensure that different pipeline MP stages get different seeds.
        seed = seed_
        if get_accelerator().device_count > 0:
            seed += 100 * mpu.get_pipeline_model_parallel_rank()
        # Ensure different data parallel ranks get different seeds
        if data_parallel_random_init:
            seed += 10 * mpu.get_data_parallel_rank()
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        if get_accelerator().device_count() > 0:
            mpu.model_parallel_cuda_manual_seed(seed)
    else:
        raise ValueError(f'Seed "{seed_}" should be a positive integer.')


def set_jit_fusion_options():
    """Set PyTorch JIT layer fusion options."""
    # flags required to enable jit fusion kernels
    TORCH_MAJOR = int(torch.__version__.split(".")[0])
    TORCH_MINOR = int(torch.__version__.split(".")[1])
    if TORCH_MAJOR > 1 or (TORCH_MAJOR == 1 and TORCH_MINOR >= 10):  # nvfuser
        torch._C._jit_set_profiling_mode(True)
        torch._C._jit_set_profiling_executor(True)
        torch._C._jit_override_can_fuse_on_cpu(False)
        torch._C._jit_override_can_fuse_on_gpu(False)
        torch._C._jit_set_texpr_fuser_enabled(False)
        torch._C._jit_set_nvfuser_enabled(True)
        torch._C._debug_set_autodiff_subgraph_inlining(False)
    else:  # legacy pytorch fuser
        torch._C._jit_set_profiling_mode(False)
        torch._C._jit_set_profiling_executor(False)
        torch._C._jit_override_can_fuse_on_cpu(True)
        torch._C._jit_override_can_fuse_on_gpu(True)

    _warmup_jit_function()


def _warmup_jit_function():
    """Compile JIT functions before the main training steps"""
    args = get_args()
    if args.bf16:
        dtype = torch.bfloat16
    elif args.fp16:
        dtype = torch.float16
    else:
        dtype = torch.float32

    # Warmup fused bias+gelu
    bias = torch.rand(
        args.ffn_hidden_size // args.tensor_model_parallel_size,
        dtype=dtype,
        device=get_accelerator(),
    )
    input = torch.rand(
        (
            args.seq_length,
            args.micro_batch_size,
            args.ffn_hidden_size // args.tensor_model_parallel_size,
        ),
        dtype=dtype,
        device=get_accelerator(),
    )
    # Warmup JIT fusions with the input grad_enable state of both forward
    # prop and recomputation
    for bias_grad, input_grad in zip([True, True], [False, True]):
        bias.requires_grad, input.requires_grad = bias_grad, input_grad
        for i in range(5):
            output = bias_gelu(bias, input)
    del bias, input, output

    # Warmup fused bias+dropout+add
    if args.sequence_parallel:
        seq_length = args.seq_length // mpu.get_tensor_model_parallel_world_size()
    else:
        seq_length = args.seq_length
    input = torch.rand(
        (seq_length, args.micro_batch_size, args.hidden_size),
        dtype=dtype,
        device=get_accelerator(),
    )
    residual = torch.rand(
        (seq_length, args.micro_batch_size, args.hidden_size),
        dtype=dtype,
        device=get_accelerator(),
    )
    bias = torch.rand(
        (args.hidden_size), dtype=dtype, device=get_accelerator(w)
    ).expand_as(residual)
    dropout_rate = 0.1
    # Warmup JIT fusions with the input grad_enable state of both forward
    # prop and recomputation
    for input_grad, bias_grad, residual_grad in zip(
        [False, True], [True, True], [True, True]
    ):
        input.requires_grad = input_grad
        bias.requires_grad = bias_grad
        residual.requires_grad = residual_grad
        for i in range(5):
            output = bias_dropout_add_fused_train(input, bias, residual, dropout_rate)
    del bias, input, residual, output
    get_accelerator().empty_cache()
