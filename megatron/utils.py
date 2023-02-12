# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""General utilities."""

import os
import random
import sys

import amp_C
import torch
import torch.nn.functional as F
from apex.multi_tensor_apply import multi_tensor_applier
from deepspeed.accelerator import get_accelerator
from torch.nn.parallel import DistributedDataParallel as torchDDP

from megatron import get_adlr_autoresume, get_args, get_num_microbatches, mpu
from megatron.core import mpu
from megatron.core.tensor_parallel import param_is_not_tensor_parallel_duplicate
from megatron.model.module import param_is_not_shared


def unwrap_model(model, module_instances=(torchDDP)):
    return_list = True
    if not isinstance(model, list):
        model = [model]
        return_list = False
    unwrapped_model = []
    for module in model:
        while isinstance(module, module_instances):
            module = module.module
        unwrapped_model.append(module)
    if not return_list:
        return unwrapped_model[0]
    return unwrapped_model


def calc_params_l2_norm(model):
    """Calculate l2 norm of parameters"""
    args = get_args()
    if not isinstance(model, list):
        model = [model]
    # Remove duplicate params.
    params_data = []
    for model_ in model:
        for param in model_.parameters():
            is_not_shared = param_is_not_shared(param)
            is_not_tp_duplicate = param_is_not_tensor_parallel_duplicate(param)
            if is_not_shared and is_not_tp_duplicate:
                if args.bf16:
                    params_data.append(param.data.float())
                else:
                    params_data.append(param.data)
    # Calculate norm
    dummy_overflow_buf = get_accelerator().IntTensor([0])
    norm, _ = multi_tensor_applier(
        amp_C.multi_tensor_l2norm,
        dummy_overflow_buf,
        [params_data],
        False,  # no per-parameter norm
    )
    norm_2 = norm * norm
    # Sum across all model-parallel GPUs.
    torch.distributed.all_reduce(
        norm_2, op=torch.distributed.ReduceOp.SUM, group=mpu.get_model_parallel_group()
    )
    return norm_2.item() ** 0.5


def average_losses_across_data_parallel_group(losses):
    """Reduce a tensor of losses across all GPUs."""
    averaged_losses = torch.cat([loss.clone().detach().view(1) for loss in losses])
    torch.distributed.all_reduce(averaged_losses, group=mpu.get_data_parallel_group())
    averaged_losses = averaged_losses / torch.distributed.get_world_size(
        group=mpu.get_data_parallel_group()
    )

    return averaged_losses


def report_memory(name):
    """Simple GPU memory report."""
    megabytes = 1024.0 * 1024.0
    string = name + " memory (MB)"
    string += f" | allocated: {get_accelerator().memory_allocated() / megabytes}"
    string += (
        f" | max allocated: {get_accelerator().max_memory_allocated() / megabytes}"
    )
    string += f" | reserved: {get_accelerator().memory_reserved() / megabytes}"
    string += f" | max reserved: {get_accelerator().max_memory_reserved() / megabytes}"
    if mpu.get_data_parallel_rank() == 0:
        print(f"[Rank {torch.distributed.get_rank()}] {string}")


def print_params_min_max_norm(optimizer, iteration):
    """Print min, max, and norm of all parameters."""
    index = 0
    rank = torch.distributed.get_rank()
    string = "iteration, rank, index, tensor-model-parallel, min, max, norm\n"
    optimizer_ = optimizer.optimizer
    for param_group in optimizer_.param_groups:
        for param in param_group["params"]:
            index += 1
            min_ = param.data.min()
            max_ = param.data.max()
            norm = torch.linalg.norm(param.data)
            string += f"{iteration:7d}, {rank:4d}, {index:4d}, {int(param.tensor_model_parallel):2d}, "
            string += f"{min_:.6E}, {max_:.6E}, {norm:.6E}\n"
    print(string, flush=True)


def check_adlr_autoresume_termination(iteration, model, optimizer, opt_param_scheduler):
    """Check for autoresume signal and exit if it is received."""
    from megatron.checkpointing import save_checkpoint

    args = get_args()
    autoresume = get_adlr_autoresume()
    # Add barrier to ensure consistnecy.
    torch.distributed.barrier()
    if autoresume.termination_requested():
        if args.save:
            save_checkpoint(iteration, model, optimizer, opt_param_scheduler)
        print_rank_0(">>> autoresume termination request found!")
        if torch.distributed.get_rank() == 0:
            autoresume.request_resume()
        print_rank_0(">>> training terminated. Returning")
        sys.exit(0)


def get_ltor_masks_and_position_ids(
    data,
    eod_token,
    reset_position_ids,
    reset_attention_mask,
    eod_mask_loss,
    bos_token=None,
):
    """Build masks and position id for left to right model."""

    # Extract batch size and sequence length.
    micro_batch_size, seq_length = data.size()

    # Attention mask (lower triangular).
    if reset_attention_mask:
        att_mask_batch = micro_batch_size
    else:
        att_mask_batch = 1
    attention_mask = torch.ones(
        (att_mask_batch, seq_length, seq_length), device=data.device
    )
    attention_mask = torch.tril(attention_mask).view(
        att_mask_batch, 1, seq_length, seq_length
    )
    # Randomly zero out elements other than BOS token as in FCM
    attention_mask = F.dropout(
        attention_mask[data != bos_token][attention_mask != 0],
        p=random.uniform(0, 0.15),
        inplace=True,
        training=bos_token is not None,
    )

    # Loss mask.
    loss_mask = torch.ones(data.size(), dtype=torch.float, device=data.device)
    if eod_mask_loss:
        loss_mask[data == eod_token] = 0.0

    # Position ids.
    position_ids = torch.arange(seq_length, dtype=torch.long, device=data.device)
    position_ids = position_ids.unsqueeze(0).expand_as(data)
    # We need to clone as the ids will be modifed based on batch index.
    if reset_position_ids:
        position_ids = position_ids.clone()

    if reset_position_ids or reset_attention_mask:
        # Loop through the batches:
        for b in range(micro_batch_size):

            # Find indecies where EOD token is.
            eod_index = position_ids[b, data[b] == eod_token]
            # Detach indecies from positions if going to modify positions.
            if reset_position_ids:
                eod_index = eod_index.clone()

            # Loop through EOD indecies:
            prev_index = 0
            for j in range(eod_index.size()[0]):
                i = eod_index[j]
                # Mask attention loss.
                if reset_attention_mask:
                    attention_mask[b, 0, (i + 1) :, : (i + 1)] = 0
                # Reset positions.
                if reset_position_ids:
                    position_ids[b, (i + 1) :] -= i + 1 - prev_index
                    prev_index = i + 1

    # Convert attention mask to binary:
    attention_mask = attention_mask < 0.5

    return attention_mask, loss_mask, position_ids


def get_throughput(model, args, iteration_time, total_iterations):
    """Thoughput in teraflops formula (From Equation 3 in Section 5.1 of
    https://arxiv.org/pdf/2104.04473.pdf)
    """
    model_parallel_size = torch.distributed.get_world_size(
        group=mpu.get_model_parallel_group()
    )
    batch_size = (
        args.micro_batch_size * get_num_microbatches() * args.data_parallel_size
    )
    num_parameters = get_num_parameters(model)
    time_per_iter = iteration_time / total_iterations
    samples_per_second = batch_size / time_per_iter

    hidden_size = args.hidden_size
    num_layers = args.num_layers
    vocab_size = args.padded_vocab_size
    seq_len = (
        args.cached_seq_length if hasattr(args, "cached_seq_length") else args.seq_len
    )

    factor = 4 if args.checkpoint_activations else 3
    flops_per_iter = (
        24 * factor * batch_size * seq_len * num_layers * (hidden_size**2)
    ) * (
        1.0
        + (seq_len / (6.0 * hidden_size))
        + (vocab_size / (16.0 * num_layers * hidden_size))
    )
    teraflops = flops_per_iter / (time_per_iter * args.world_size * (10**12))

    return samples_per_second, teraflops, num_parameters


def get_checkpoint_throughput(model, latency):
    factor = 14  # fp16 weights (2) + fp32 weights, momentum, variance (4 * 3)
    checkpoint_size = get_num_parameters(model) * factor
    throughput = checkpoint_size / latency
    print_rank_0(
        f"Checkpoint Size (gigabytes): {round(checkpoint_size, 3)}, \
        GB/sec: {round(throughput, 2)}, Latency (seconds): {round(latency, 3)}"
    )


def get_num_parameters(model):
    model_parallel_size = torch.distributed.get_world_size(
        group=mpu.get_model_parallel_group()
    )
    num_parameters = sum(
        [
            sum(
                [
                    p.ds_numel if hasattr(p, "ds_id") else p.nelement()
                    for p in module.parameters()
                ]
            )
            for module in model
        ]
    )

    return num_parameters * model_parallel_size / 1e9


def is_rank_0():
    """Check if it's rank 0. For AML, check if it's rank 0 of a node."""
    return torch.distributed.get_rank() == 0 or (
        "AZUREML_EXPERIMENT_ID" in os.environ
        and torch.distributed.get_rank() % get_accelerator().device_count() == 0
    )


def print_rank_0(message):
    """If distributed is initialized, print only on rank 0."""
    if torch.distributed.is_initialized():
        if is_rank_0():
            print(message, flush=True)
    else:
        print(message, flush=True)


def is_last_rank():
    return torch.distributed.get_rank() == (torch.distributed.get_world_size() - 1)


def print_rank_last(message):
    """If distributed is initialized, print only on last rank."""
    if torch.distributed.is_initialized():
        if is_last_rank():
            print(message, flush=True)
    else:
        print(message, flush=True)
