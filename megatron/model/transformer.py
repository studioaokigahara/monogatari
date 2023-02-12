# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""Transformer."""
import math
from contextlib import nullcontext
from enum import Enum
from typing import Callable, List, Optional

import deepseed
import faiss
import torch
import torch.nn.functional as F
from deepspeed.accelerator import get_accelerator
from einops import einsum, pack, rearrange, reduce, repeat, unpack

from megatron import core, get_args, get_num_microbatches, get_timers
from megatron.core import mpu, tensor_parallel
from megatron.model import LayerNorm
from megatron.model.enums import AttnMaskType, AttnType, LayerType, ModelType
from megatron.model.flash_attention import FlashAttention
from megatron.model.fused_softmax import FusedScaleMaskSoftmax
from megatron.model.utils import attention_mask_func

from .module import MegatronModule

""" We use the following notation throughout this file:
        h: hidden size
        n: number of attention heads
        p: number of model parallel partitions
        np: n/p
        hp: h/p
        hn: h/n
        b: batch size
        s: sequence length
        l: number of layers
    Transformer takes input of size [s, b, h] and returns a
    tensor of the same size. We use the following arguments:
        hyperparameters: transformer hyperparameters
"""


class DropPath(MegatronModule):
    """Drop paths (Stochastic Depth) per sample
    (when applied in main path of residual blocks).
    """

    def __init__(self, drop_prob: float = 0.0):
        super(DropPath, self).__init__()
        self.drop_prob = drop_prob

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        if self.drop_prob == 0.0 or not self.training:
            return hidden_states
        keep_prob = 1 - self.drop_prob
        # work with diff dim tensors, not just 2D ConvNets
        # hidden_states: [s, b, h]
        shape = (1,) + (hidden_states.shape[1],) + (1,) * (hidden_states.ndim - 2)
        random_tensor = keep_prob + torch.rand(
            shape, dtype=hidden_states.dtype, device=hidden_states.device
        )
        random_tensor.floor_()  # binarize
        output = hidden_states.div(keep_prob) * random_tensor

        return output


def _args_to_kwargs():
    args = get_args()

    common_kwargs = {
        "params_dtype": args.params_dtype,
        "use_cpu_initialization": args.use_cpu_initialization,
        "perform_initialization": args.perform_initialization,
        "gradient_accumulation_fusion": args.gradient_accumulation_fusion,
        "sequence_parallel_enabled": args.sequence_parallel,
    }
    return common_kwargs


class ParallelMLP(MegatronModule):
    """MLP.

    MLP will take the input with h hidden state, project it to 4*h
    hidden dimension, perform nonlinear transformation, and project the
    state back into h hidden dimension.
    """

    def __init__(
        self, init_method: torch.nn.init, output_layer_init_method: torch.nn.init
    ):
        super(ParallelMLP, self).__init__()
        args = get_args()

        # Sub-LN adds a scaled LN before each linear
        self.sub_ln = args.sub_ln
        self.pre_layernorm = LayerNorm(
            args.hidden_size,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )
        self.post_layernorm = LayerNorm(
            args.hidden_size,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )

        # Project to 4h.
        self.dense_h_to_4h = mpu.ColumnParallelLinear(
            args.hidden_size,
            args.ffn_hidden_size,
            bias=False,
            gather_output=False,
            init_method=init_method,
            async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
            **_args_to_kwargs()
        )

        if args.activation_func == gelu:
            self.activation_func = F.gelu
        elif args.activation_func == squared_relu:
            self.activation_func = F.relu
            self.squared_relu = True
        elif args.activation_func == squish or squish2 or swiglu:
            self.activation_func = F.silu
            if args.activation_func == squish:
                self.squish = True
                self.squishy = 1.4
            elif args.activation_func == squish2:
                self.squish2 = True
                self.squishy = 1.8
            elif args.activation_func == swiglu:
                self.swiglu = True

        # Project back to h.
        self.dense_4h_to_h = mpu.RowParallelLinear(
            args.ffn_hidden_size,
            args.hidden_size,
            bias=False,
            input_is_parallel=True,
            init_method=output_layer_init_method,
            **_args_to_kwargs()
        )

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        residual = hidden_states

        if self.sub_ln:
            hidden_states = self.pre_layernorm(hidden_states)

        # [s, b, 4hp]
        intermediate_parallel = self.dense_h_to_4h(hidden_states)

        if self.squared_relu:
            intermediate_parallel = torch.square(
                self.activation_func(intermediate_parallel)
            )
        elif self.squish or self.squish2:
            intermediate_parallel = torch.pow(
                self.activation_func(intermediate_parallel), self.squishy
            )
        elif self.swiglu:
            intermediate_parallel, gate = intermediate_parallel.chunk(2)
            intermediate_parallel *= self.activation_func(gate)
        else:
            intermediate_parallel = self.activation_func(intermediate_parallel)

        if self.sub_ln:
            intermediate_parallel = self.post_layernorm(intermediate_parallel)

        # [s, b, h]
        output = self.dense_4h_to_h(intermediate_parallel) + residual

        return output


class SwitchMLP(MegatronModule):
    """Routes input to one of N MLP 'experts'"""

    def __init__(
        self, init_method: torch.nn.init, output_layer_init_method: torch.nn.init
    ):
        super(SwitchMLP, self).__init__()
        args = get_args()

        self.xmoe = args.xmoe
        self.expert_choice = args.expert_choice

        if self.xmoe:
            self.wg_reduction = mpu.ColumnParallelLinear(
                args.hidden_size,
                args.num_experts / 2,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )
            self.wg = torch.nn.Parameter(
                torch.empty(args.num_experts, args.num_experts / 2)
            )
            torch.nn.init.orthogonal_(self.wg, gain=0.32)
        else:
            self.wg_reduction = mpu.ColumnParallelLinear(
                args.hidden_size,
                args.num_experts,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )

        self.experts = torch.nn.ModuleList()
        for i in range(args.num_experts):
            self.experts.append(ParallelMLP(init_method, output_layer_init_method))
        for p in self.experts.parameters():
            p.expert = True
            p.data *= 1 / math.sqrt(args.num_experts)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        seq_len, batch_size, hidden_size = hidden_states.shape
        capacity = ((seq_len * batch_size) * 2) / len(self.experts)

        if self.xmoe:
            # Reduce hidden states to same size as expert embeddings
            scores = self.wg_reduction(hidden_states)

            # Perform L2 normalization
            with torch.no_grad():
                self.wg *= 1.5 / self.wg.norm(p=2.0, dim=1, keepdim=True)
                self.wg = F.normalize(self.wg, p=2.0, dim=1, eps=1e-4)
                self.wg = rearrange(self.wg, "s b -> b s")
                scores = einsum(scores, self.wg, "s b h, b s -> s b h")
                if not scores.isfinite().all():
                    scores[~scores.isfinite()] = scores[scores.isfinite()].min()
        else:
            scores = self.wg_reduction(hidden_states)

        scores = F.softmax(scores, dim=2)

        if self.expert_choice:
            # Expert choice routing
            gating_matrix, index_matrix = torch.topk(scores, capacity)
            permute_matrix = F.one_hot(index_matrix)

            expert_input = hidden_states * permute_matrix

            for idx, expert in enumerate(self.experts):
                expert_output = expert(expert_input)

            output = einsum(
                permute_matrix, gating_matrix, x, "i j l, i j, i j h -> l h"
            )
            output = rearrange(
                x, "(s b) h -> s b h", s=seq_len, b=batch_size, h=hidden_size
            )
        else:
            # Switch Transformer top-1 routing
            max_prob, max_idx = torch.max(scores, dim=2)
            max_prob = rearrange(max_prob, "s b -> (s b) 1")
            max_idx = rearrange(max_idx, "s b -> (s b)")
            hidden_states = rearrange(hidden_states, "s b h -> (s b) h")

            for idx, expert in enumerate(self.experts):
                local_idx = (max_idx == idx).nonzero()
                expert_output = expert(hidden_states[local_idx, :])
                output[local_idx, :] = expert_output

            output *= max_prob
            output = rearrange(
                x, "(s b) h -> s b h", s=seq_len, b=batch_size, h=hidden_size
            )

        return output


class CoreAttention(MegatronModule):
    def __init__(self, attn_mask_type: Enum = AttnMaskType.padding):
        super(CoreAttention, self).__init__()
        args = get_args()

        attention_softmax_in_fp32 = args.attention_softmax_in_fp32
        if args.apply_query_key_layer_scaling:
            attention_softmax_in_fp32 = True
        self.sequence_parallel = args.sequence_parallel

        projection_size = args.kv_channels * args.num_attention_heads

        # Per attention head and per partition values
        world_size = mpu.get_tensor_model_parallel_world_size()
        self.hidden_size_per_partition = core.utils.divide(projection_size, world_size)
        hidden_size_per_attention_head = core.utils.divide(
            projection_size, args.num_attention_heads
        )
        self.num_attention_heads_per_partition = core.utils.divide(
            args.num_attention_heads, world_size
        )

        coeff = None
        self.norm_factor = math.sqrt(hidden_size_per_attention_head)
        if args.apply_query_key_layer_scaling:
            coeff = layer_number
            self.norm_factor *= coeff

        self.scale_mask_softmax = FusedScaleMaskSoftmax(
            args.fp16,
            args.bf16,
            attn_mask_type,
            args.masked_softmax_fusion,
            attention_mask_func,
            attention_softmax_in_fp32,
            coeff,
        )

        # Dropout. Note that for a single iteration, this layer will generate
        # different outputs on different number of parallel partitions but
        # on average it should not be partition dependent.
        self.attention_dropout = torch.nn.Dropout(args.attention_dropout)

    def forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:

        seq_len, batch_size, _, _ = query.size()

        query = rearrange(query, "sq b np hn -> (b np) sq hn")
        key = rearrange(key, "sk b np hn -> (b np) hn sk")

        # Raw attention scores [b, np, s, s]
        attention_scores = einsum(
            query,
            key,
            "(b np) sq hn, (b np) hn sk -> b np sq sk",
            b=batch_size,
            np=self.num_attention_heads_per_partition,
        )
        attention_scores *= 1.0 / self.norm_factor

        ### Attention probs and dropout
        # Attention scores and attention mask [b, np, sq, sk]
        attention_probs = self.scale_mask_softmax(attention_scores, attention_mask)

        # This is actually dropping out entire tokens to attend to, which might
        # seem a bit unusual, but is taken from the original Transformer paper.
        if not self.sequence_parallel:
            with mpu.get_cuda_rng_tracker().fork():
                attention_probs = self.attention_dropout(attention_probs)
        else:
            attention_probs = self.attention_dropout(attention_probs)

        # Context layer. [sq, b, hp]
        value = rearrange(value, "sk b np hn -> (b np) sk hn")
        attention_probs = rearrange(attention_probs, "b np sq sk -> (b np) sq sk")

        context = einsum(
            attention_probs, value, "(b np) sq sk, (b np) sk hn -> (b np) sq hn"
        )

        context = rearrange(
            context,
            "(b np) sq hn -> s b h",
            s=seq_len,
            b=batch_size,
            h=self.hidden_size_per_partition,
        )

        return context


class ParallelAttention(MegatronModule):
    """Parallel self-attention layer abstract class.

    Self-attention layer takes input with size [s, b, h]
    and returns output of the same size.
    """

    def __init__(
        self,
        init_method: torch.nn.init,
        output_layer_init_method: torch.nn.init,
        layer_number: int,
        attn_type: Enum = AttnType.self_attn,
        attn_mask_type: Enum = AttnMaskType.padding,
    ):
        super(ParallelAttention, self).__init__()
        args = get_args()

        self.layer_number = max(1, layer_number)
        self.attn_type = attn_type
        self.attn_mask_type = attn_mask_type
        self.params_dtype = args.params_dtype
        self.sequence_parallel = args.sequence_parallel
        self.attention_dropout = args.attention_dropout

        projection_size = args.kv_channels * args.num_attention_heads

        # Per attention head and per partition values.
        world_size = mpu.get_tensor_model_parallel_world_size()
        self.hidden_size_per_attention_head = core.utils.divide(
            projection_size, args.num_attention_heads
        )
        self.num_attention_heads_per_partition = core.utils.divide(
            args.num_attention_heads, world_size
        )

        # Strided linear layer.
        if attn_type == AttnType.self_attn:
            self.query_key_value = mpu.ColumnParallelLinear(
                args.hidden_size,
                3 * projection_size,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )
        else:
            assert attn_type == AttnType.cross_attn
            self.query = mpu.ColumnParallelLinear(
                args.hidden_size,
                projection_size,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )

            self.key_value = mpu.ColumnParallelLinear(
                args.hidden_size,
                2 * projection_size,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )
        self.checkpoint_core_attention = args.recompute_granularity == "selective"
        self.use_flash_attn = args.use_flash_attn
        if self.checkpoint_core_attention:
            self.core_attention = self._checkpointed_attention_forward()
        elif self.use_flash_attn:
            assert self.hidden_size_per_attention_head <= 128
            self.core_attention = FlashAttention.apply()
        else:
            self.core_attention = CoreAttention(attn_mask_type)

        # Output.
        self.dense = mpu.RowParallelLinear(
            projection_size,
            args.hidden_size,
            bias=False,
            input_is_parallel=True,
            init_method=output_layer_init_method,
            **_args_to_kwargs()
        )

    def _checkpointed_attention_forward(self, query, key, value, attention_mask):
        """Forward method with activation checkpointing."""

        def custom_forward(*inputs):
            query = inputs[0]
            key = inputs[1]
            value = inputs[2]
            attention_mask = inputs[3]
            output_ = self.core_attention(query, key, value, attention_mask)
            return output_

        hidden_states = mpu.checkpoint(
            custom_forward, False, query, key, value, attention_mask
        )

        return hidden_states

    def _allocate_memory(
        self, inference_max_sequence_len: int, batch_size: int
    ) -> torch.tensor:
        return torch.empty(
            inference_max_sequence_len,
            batch_size,
            self.num_attention_heads_per_partition,
            self.hidden_size_per_attention_head,
            dtype=self.params_dtype,
            device=get_accelerator().current_device(),
        )

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.Tensor = None,
        enc_dec_attn_mask: Optional[torch.Tensor] = None,
        encoder_output: Optional[torch.Tensor] = None,
        inference_params: Optional[Callable] = None,
    ) -> torch.Tensor:
        # hidden_states: [sq, b, h]
        residual = hidden_states

        # Pre-allocate memory for key and value for inference
        if inference_params:
            if self.layer_number not in inference_params.key_value_memory_dict:
                inf_max_seq_len = inference_params.max_sequence_len
                inf_max_batch_size = inference_params.max_batch_size
                inference_key_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_value_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_params.key_value_memory_dict[self.layer_number] = (
                    inference_key_memory,
                    inference_value_memory,
                )
            else:
                (
                    inference_key_memory,
                    inference_value_memory,
                ) = inference_params.key_value_memory_dict[self.layer_number]

        # Query, Key, and Value

        if self.attn_type == AttnType.self_attn:
            # Attention heads [sq, b, h] --> [sq, b, (np * 3 * hn)]
            mixed_x_layer, _ = self.query_key_value(hidden_states)

            mixed_x_layer = rearrange(
                mixed_x_layer,
                "sq b (np hn) -> sq b np hn",
                np=self.num_attention_heads_per_partition,
                hn=3 * self.hidden_size_per_attention_head,
            )

            # [sq, b, np, 3 * hn] --> 3 [sq, b, np, hn]
            (query, key, value) = mpu.split_tensor_along_last_dim(mixed_x_layer, 3)
        else:
            # Attention heads [sk, b, h] --> [sk, b, (np * 2 * hn)]
            mixed_kv_layer, _ = self.key_value(encoder_output)

            mixed_kv_layer = rearrange(
                mixed_kv_layer,
                "sk b (np hn) -> sk b np hn",
                np=self.num_attention_heads_per_partition,
                hn=2 * self.hidden_size_per_attention_head,
            )

            # [sk, b, np, 2 * hn] --> 2 [sk, b, np, hn]
            (key, value) = mpu.split_tensor_along_last_dim(mixed_kv_layer, 2)

            # Attention head [sq, b, h] --> [sq, b, hp]
            query, _ = self.query(hidden_states)

            query = rearrange(
                query,
                "sq b (np hn) -> sq b np hn",
                np=self.num_attention_heads_per_partition,
                hn=self.hidden_size_per_attention_head,
            )

        # Adjust key and value for inference
        if inference_params:
            batch_start = inference_params.batch_size_offset
            batch_end = batch_start + key.size(1)
            assert batch_end <= inference_key_memory.size(1)
            sequence_start = inference_params.sequence_len_offset
            sequence_end = sequence_start + key.size(0)
            assert sequence_end <= inference_key_memory.size(0)
            # Copy key and values.
            inference_key_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = key
            inference_value_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = value
            key = inference_key_memory[:sequence_end, batch_start:batch_end, ...]
            value = inference_value_memory[:sequence_end, batch_start:batch_end, ...]

        # Core attention computation
        if self.use_flash_attn:
            query, key, value = [
                rearrange(x, "s b ... -> b s ...") for x in [query, key, value]
            ]
            if not self.sequence_parallel:
                with mpu.get_cuda_rng_tracker().fork():
                    context = self.core_attention(
                        query,
                        key,
                        value,
                        dropout=self.attention_dropout,
                        casual=self.attn_mask_type == AttnMaskType.causal,
                        sequence_parallel=self.sequence_parallel,
                    )
            else:
                context = self.core_attention(
                    query,
                    key,
                    value,
                    dropout=self.attention_dropout,
                    casual=self.attn_mask_type == AttnMaskType.causal,
                    sequence_parallel=self.sequence_parallel,
                )
            context = rearrange(context, "b s h d -> s b (h d)")
        else:
            context = self.core_attention(query, key, value, attention_mask)

        # Output. [sq, b, h]
        output = self.dense(context) + residual

        return output


class MEGA(MegatronModule):
    """Moving Average Equipped Gated Attention (MEGA):
    https://arxiv.org/abs/2209.10655 (Ma et al., 2022)

    Takes input of size [s, b, h] and efficiently computes attention using
    a single-head gated attention mechanism that incorporates stronger
    inductive bias (relative to vanilla attention) using an EMA submodule.
    Note that we don't support MEGA-chunk; we don't find the additional quality
    loss worth it when MEGA is already ~3x faster and ~70% more memory efficient
    than vanilla attention even without a fused core attention kernel.
    """

    def __init__(
        self,
        init_method: torch.nn.init,
        output_layer_init_method: torch.nn.init,
        layer_number: int,
        attn_type: Enum = AttnType.mega,
        attn_mask_type: Enum = AttnMaskType.padding,
    ):
        super(MEGA, self).__init__()
        args = get_args()

        self.layer_number = max(1, layer_number)
        self.attn_mask_type = attn_mask_type
        self.params_dtype = args.params_dtype
        self.sequence_parallel = args.sequence_parallel
        self.attention_dropout = args.attention_dropout

        self.ema_scale = math.sqrt(1.0 / args.mega_ema_size)
        self.z_size = args.mega_z_size
        self.h_size = args.mega_h_size
        proj_size = self.z_size + self.h_size + (2 * args.hidden_size)

        self.sub_ln = args.sub_ln
        self.prenorm = args.mega_prenorm
        self.pre_layernorm = LayerNorm(
            args.hidden_size,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )
        self.post_layernorm = LayerNorm(
            args.hidden_size,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )

        self.dconv = args.mega_dconv
        self.z_proj = mpu.ColumnParallelLinear(
            args.hidden_size,
            proj_size,
            bias=False,
            gather_output=False,
            init_method=init_method,
            async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
            **_args_to_kwargs()
        )
        self.z_conv = torch.nn.Conv1d(proj_size, proj_size, 3, groups=proj_size)
        self.v_proj = mpu.ColumnParallelLinear(
            args.hidden_size,
            self.h_size,
            bias=False,
            gather_output=False,
            init_method=init_method,
            async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
            **_args_to_kwargs()
        )
        self.v_conv = torch.nn.Conv1d(self.h_size, self.h_size, 3, groups=self.h_size)
        self.h_proj = mpu.RowParallelLinear(
            self.h_size,
            args.hidden_size,
            bias=False,
            input_is_parallel=True,
            init_method=output_layer_init_method,
            **_args_to_kwargs()
        )

        self.key = torch.nn.Parameter(
            torch.randn(args.mega_num_persistent_memories, 1, self.z_size)
        )
        self.value = torch.nn.Parameter(
            torch.randn(args.mega_num_persistent_memories, 1, self.h_size)
        )
        torch.nn.init.normal_(self.key, std=1.0 / math.sqrt(self.z_size))
        torch.nn.init.normal_(self.value, std=1.0 / math.sqrt(self.h_size))

        self.xpos = xPos

        self.checkpoint_core_attention = args.recompute_granularity == "selective"
        self.use_flash_attn = args.use_flash_attn
        if self.checkpoint_core_attention:
            self.core_attention = self._checkpointed_attention_forward
        elif args.use_flash_attn:
            assert self.z_size and self.h_size <= 128
            self.core_attention = FlashAttention.apply
        else:
            self.core_attention = CoreAttention(attn_mask_type)

        self.alpha = torch.nn.Parameter(
            torch.Tensor(args.hidden_size, args.mega_ema_size, 1)
        )
        self.beta = torch.nn.Parameter(
            torch.Tensor(args.hidden_size, args.mega_ema_size, 1)
        )
        self.delta = torch.nn.Parameter(
            torch.Tensor(args.hidden_size, args.mega_ema_size, 1)
        )
        self.gamma = torch.nn.Parameter(
            torch.Tensor(args.hidden_size, args.mega_ema_size)
        )
        self.zeta = torch.nn.Parameter(torch.Tensor(args.hidden_size))

        self.kappa = torch.nn.Parameter(torch.Tensor(2, args.mega_z_size))
        self.sigma = torch.nn.Parameter(torch.Tensor(2, args.mega_z_size))

    def _checkpointed_attention_forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.tensor:
        def custom_forward(*inputs):
            query = inputs[0]
            key = inputs[1]
            value = inputs[2]
            attention_mask = inputs[3]
            output_ = self.core_attention(query, key, value, attention_mask)
            return output_

        hidden_states = mpu.checkpoint(
            custom_forward, False, query, key, value, attention_mask
        )

        return hidden_states

    def _allocate_memory(
        self, inference_max_sequence_len: int, batch_size: int
    ) -> torch.tensor:
        return torch.empty(
            inference_max_sequence_len,
            batch_size,
            1,
            args.hidden_size,
            dtype=self.params_dtype,
            device=get_accelerator().current_device(),
        )

    def EMA(
        self, hidden_states: torch.Tensor, padding_mask: Optional[torch.Tensor]
    ) -> torch.Tensor:
        seq_len = hidden_states.shape[0]
        residual = hidden_states * self.zeta

        hidden_states = rearrange(hidden_states, "s b h -> b h s")

        if padding_mask is not None:
            padding_mask = rearrange(padding_mask, "s b -> s 1 b")
            hidden_states *= 1.0 - padding_mask.type_as(hidden_states)

        p = torch.sigmoid(self.delta)
        q = (1.0 - p) * torch.sigmoid(self.alpha)
        vander = rearrange(torch.arange(seq_len).to(p), "s -> 1 1 s")
        vander = torch.exp(vander * torch.log(q)) * p * self.beta
        kernel = einsum(vander, self.gamma * self.ema_scale, "d n l, d n -> d l")

        k_f, x_f = [
            torch.fft.rfft(x.float(), n=2 * seq_len) for x in [kernel, hidden_states]
        ]
        output = torch.fft.irfft(k_f * x_f, n=2 * seq_len)[..., 0:seq_len].type_as(
            hidden_states
        )
        output = F.silu(rearrange(output, "b h s -> s b h") + residual)

        return output

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.Tensor = None,
        padding_mask: Optional[torch.Tensor] = None,
        inference_params: Optional[Callable] = None,
    ):
        residual = hidden_states

        # Pre-allocate memory for key and value for inference
        if inference_params:
            if self.layer_number not in inference_params.key_value_memory_dict:
                inf_max_seq_len = inference_params.max_sequence_len
                inf_max_batch_size = inference_params.max_batch_size
                inference_key_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_value_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_params.key_value_memory_dict[self.layer_number] = (
                    inference_key_memory,
                    inference_value_memory,
                )
            else:
                (
                    inference_key_memory,
                    inference_value_memory,
                ) = inference_params.key_value_memory_dict[self.layer_number]

        if self.sub_ln or self.prenorm:
            hidden_states = self.pre_layernorm(hidden_states)

        z_prior = self.EMA(hidden_states, padding_mask)
        z_prior = self.z_proj(z_prior)
        value = self.v_proj(hidden_states)
        if self.dconv:
            z_prior = self.z_conv(z_prior)
            value = self.v_conv(value)
        value = F.silu(value)

        mu, zr, hx = unpack(
            z_prior,
            [[self.hidden_size], [self.z_size + self.h_size], [self.hidden_size]],
            "s b *",
        )
        mu = torch.sigmoid(mu)
        z, r = unpack(F.silu(zr), [[self.z_size], [self.h_size]], "s b *")
        query, key = rearrange(z, "s b 1 h -> s b h")

        key, _ = pack([key, self.key], "* b h")
        value, _ = pack([value, self.value], "* b h")
        query, key = self.xpos(query, key, value)

        query, key, value = [
            rearrange(x, "s b h -> s b 1 h") for x in [query, key, value]
        ]
        query *= self.z_size**-0.5

        # Adjust key and value for inference
        if inference_params:
            batch_start = inference_params.batch_size_offset
            batch_end = batch_start + key.size(1)
            assert batch_end <= inference_key_memory.size(1)
            sequence_start = inference_params.sequence_len_offset
            sequence_end = sequence_start + key.size(0)
            assert sequence_end <= inference_key_memory.size(0)
            inference_key_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = key
            inference_value_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = value
            key = inference_key_memory[:sequence_end, batch_start:batch_end, ...]
            value = inference_value_memory[:sequence_end, batch_start:batch_end, ...]

        # Core attention computation
        if self.use_flash_attn:
            query, key, value = [
                rearrange(x, "s b 1 h -> b s 1 h") for x in [query, key, value]
            ]
            if self.sequence_parallel:
                rng_context = mpu.get_cuda_rng_tracker().fork()
            else:
                rng_context = nullcontext()
            with rng_context:
                h = self.core_attention(
                    query,
                    key,
                    value,
                    dropout=self.attention_dropout,
                    casual=self.attn_mask_type == AttnMaskType.causal,
                    sequence_parallel=self.sequence_parallel,
                )
            h = rearrange(x, "b s 1 h -> s b h")
        else:
            h = self.core_attention(query, key, value, attention_mask)

        h = F.silu(hx + self.h_proj(h * r))
        output = mu * (h - residual) + residual
        if self.sub_ln or not self.prenorm:
            output = self.post_layernorm(output)

        return output


class MemorizingMEGA(MEGA):
    """Implements the memory mechanism from Memorizing Transformers on top of MEGA:
    https://arxiv.org/abs/2203.08913 (Wu et al., 2022)

    We initialize, add to, and efficiently search an index of past key-values
    using faiss-GPU and concatenate the results of memory attention with local
    attention using a learned sigmoid gate as in the paper. While theoretically
    this could be implemented on top of vanilla attention, we implement it on top
    of MEGA to help mitigate the step time increase incurred by having to run the
    core attention computation twice.
    """

    def __init__(
        self,
        init_method: torch.nn.init,
        output_layer_init_method: torch.nn.init,
        layer_number: int,
        attn_type: Enum = AttnType.memory,
        attn_mask_type: Enum = AttnMaskType.padding,
    ):
        super(MemorizingMEGA, self).__init__()
        args = get_args()

        # based on faiss docs, flat IVF + HSNW has the best performance curves
        # while still supporting potentially very large (>1M) indexes
        quantizer = faiss.IndexHNSWFlat(
            args.mega_memory_size, args.mega_memory_num_neighbors
        )
        index = faiss.IndexIVFFlat(
            quantizer,
            args.mega_memory_size,
            args.mega_memory_num_clusters,
            faiss.METRIC_INNER_PRODUCT,
        )
        refinement_index = faiss.IndexRefineFlat(index)
        self.index = faiss.index_cpu_to_all_gpus(refinement_index)
        self.topk = args.mega_memory_topk
        self.num_probes = args.mega_memory_topk or args.mega_memory_num_probes
        self.max_memories = args.mega_memory_max_size or args.hidden_size**2
        self.memory_bias = torch.nn.Parameter(torch.ones(1, 1, self.h_size))

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.Tensor = None,
        padding_mask: Optional[torch.Tensor] = None,
        inference_params: Optional[Callable] = None,
    ):
        residual = hidden_states

        # Pre-allocate memory for key and value for inference
        if inference_params:
            if self.layer_number not in inference_params.key_value_memory_dict:
                inf_max_seq_len = inference_params.max_sequence_len
                inf_max_batch_size = inference_params.max_batch_size
                inference_key_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_value_memory = self._allocate_memory(
                    inf_max_seq_len, inf_max_batch_size
                )
                inference_params.key_value_memory_dict[self.layer_number] = (
                    inference_key_memory,
                    inference_value_memory,
                )
            else:
                (
                    inference_key_memory,
                    inference_value_memory,
                ) = inference_params.key_value_memory_dict[self.layer_number]

        if self.sub_ln or self.prenorm:
            hidden_states = self.pre_layernorm(hidden_states)

        z_prior = self.EMA(hidden_states, padding_mask)
        z_prior = self.z_proj(z_prior)
        value = self.v_proj(hidden_states)
        if self.dconv:
            z_prior = self.z_conv(z_prior)
            value = self.v_conv(value)
        value = F.silu(value)

        mu, zr, hx = unpack(
            z_prior,
            [[self.hidden_size], [self.z_size + self.h_size], [self.hidden_size]],
            "s b *",
        )
        mu = torch.sigmoid(mu)
        z, r = unpack(F.silu(zr), [[self.z_size], [self.h_size]], "s b *")
        query, key = rearrange(z, "s b 1 h -> s b h")

        query, key, value = [faiss.normalize_L2(x) for x in [query, key, value]]
        # add kv to memory before persistent memory concat and relpos
        self.index.add(key, value)
        mem_key, mem_value = self.index.search(query, self.topk)
        if self.index.ntotal > self.max_memories:
            removed = torch.arange(self.index.ntotal - self.max_memories)
            self.index.remove_ids(removed)

        key, _ = pack([key, self.key], "* b h")
        value, _ = pack([value, self.value], "* b h")
        query, key = self.xpos(query, key, value)
        _, mem_key = self.xpos(query, mem_key, mem_value)

        query, key, value, mem_key, mem_value = [
            rearrange(x, "s b h -> s b 1 h")
            for x in [query, key, value, mem_key, mem_value]
        ]
        query *= self.z_size**-0.5

        # Adjust key and value for inference
        if inference_params:
            batch_start = inference_params.batch_size_offset
            batch_end = batch_start + key.size(1)
            assert batch_end <= inference_key_memory.size(1)
            sequence_start = inference_params.sequence_len_offset
            sequence_end = sequence_start + key.size(0)
            assert sequence_end <= inference_key_memory.size(0)
            inference_key_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = key
            inference_value_memory[
                sequence_start:sequence_end, batch_start:batch_end, ...
            ] = value
            key = inference_key_memory[:sequence_end, batch_start:batch_end, ...]
            value = inference_value_memory[:sequence_end, batch_start:batch_end, ...]

        # Core attention computation
        if self.use_flash_attn:
            query, key, value, mem_key, mem_value = [
                rearrange(x, "s b 1 h -> b s 1 h") for x in [query, key, value]
            ]
            if self.sequence_parallel:
                rng_context = mpu.get_cuda_rng_tracker().fork()
            else:
                rng_context = nullcontext()
            with rng_context:
                h = self.core_attention(
                    query,
                    key,
                    value,
                    dropout=self.attention_dropout,
                    casual=self.attn_mask_type == AttnMaskType.causal,
                    sequence_parallel=self.sequence_parallel,
                )
                h_mem = self.core_attention(
                    query,
                    mem_key,
                    mem_value,
                    dropout=self.attention_dropout,
                    casual=self.attn_mask_type == AttnMaskType.causal,
                    sequence_parallel=self.sequence_parallel,
                )

            h, h_mem = [rearrange(x, "b s 1 h -> s b h") for x in [h, h_mem]]
        else:
            h = self.core_attention(query, key, value, attention_mask)
            h_mem = self.core_attention(query, mem_key, mem_value, attention_mask)

        memory_gate = torch.sigmoid(self.memory_bias)
        h = h * memory_gate + h_mem * (1 - memory_gate)
        h = F.silu(hx + self.h_proj(h * r))

        output = mu * (h - residual) + residual
        if self.sub_ln or not self.prenorm:
            output = self.post_layernorm(output)

        return output


class SwitchAttention(MegatronModule):
    """Routes input to one of N Attention 'experts'
    Inspired by Mixture-of-Attention-Heads:
    https://arxiv.org/abs/2210.05144v1 (Zhang et al., 2022)

    Since MEGA uses single-head attention, instead of parameterizing
    MoA as a mixture of attention heads as in the paper we instead
    extend SwitchMLP and parameterize each 'expert' as an entire
    attention module. Doesn't currently support cross-attention.
    """

    def __init__(
        self,
        init_method: torch.nn.init,
        output_layer_init_method: torch.nn.init,
        layer_number: int,
        attn_type: Enum = AttnType.self_attn,
        attn_mask_type: Enum = AttnMaskType.padding,
    ):
        super(SwitchAttention, self).__init__()
        args = get_args()

        self.layer_number = max(1, layer_number)
        self.attn_type = attn_type
        self.attn_mask_type = attn_mask_type

        self.xmoe = args.xmoe
        self.expert_choice = args.expert_choice

        if self.xmoe:
            self.wg_reduction = mpu.ColumnParallelLinear(
                args.hidden_size,
                args.num_experts / 2,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )
            self.wg = torch.nn.Parameter(
                torch.empty(args.num_experts, args.num_experts / 2)
            )
            torch.nn.init.orthogonal_(self.wg, gain=0.32)
        else:
            self.wg_reduction = mpu.ColumnParallelLinear(
                args.hidden_size,
                args.num_experts,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            )

        assert self.attn_type != AttnType.cross_attn
        if self.attn_type == AttnType.self_attn:
            attn_expert = ParallelAttention(
                init_method,
                output_layer_init_method,
                self.layer_number,
                self.attn_type,
                self.attn_mask_type,
            )
        elif self.attn_type == AttnType.mega:
            attn_expert = MEGA(
                init_method,
                output_layer_init_method,
                self.layer_number,
                self.attn_type,
                self.attn_mask_type,
            )
        elif self.attn_type == AttnType.memory:
            attn_expert = MemorizingMEGA(
                init_method,
                output_layer_init_method,
                self.layer_number,
                self.attn_type,
                self.attn_mask_type,
            )

        self.experts = torch.nn.ModuleList()
        for i in range(args.num_attn_experts):
            self.experts.append(attn_expert)
        for p in self.experts.parameters():
            p.expert = True
            p.data *= 1 / math.sqrt(args.num_attn_experts)

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.tensor,
        inference_params: Optional[Callable] = None,
    ) -> torch.Tensor:
        seq_len, batch_size, hidden_size = hidden_states.shape
        capacity = seq_len * batch_size * 2 / len(self.experts)

        if self.xmoe:
            # Reduce hidden states to same size as expert embeddings
            scores = self.wg_reduction(hidden_states)

            # Perform L2 normalization
            with torch.no_grad():
                self.wg *= 1.5 / self.wg.norm(p=2.0, dim=1, keepdim=True)
                self.wg = F.normalize(self.wg, p=2.0, dim=1, eps=1e-4)
                self.wg = rearrange(self.wg, "s b -> b s")
                scores = einsum(scores, self.wg, "s b h, b s -> s b h")
                if not scores.isfinite().all():
                    scores[~scores.isfinite()] = scores[scores.isfinite()].min()
        else:
            scores = self.wg_reduction(hidden_states)

        scores = F.softmax(scores, dim=2)

        if self.expert_choice:
            # Expert choice routing
            gating_matrix, index_matrix = torch.topk(scores, capacity)
            permute_matrix = F.one_hot(index_matrix)

            expert_input = hidden_states * permute_matrix

            for idx, expert in enumerate(self.experts):
                expert_output = expert(
                    expert_input,
                    attention_mask,
                    inference_params=inference_params,
                )

            output = einsum(
                permute_matrix, gating_matrix, x, "i j l, i j, i j h -> l h"
            )
            output = rearrange(
                x, "(s b) h -> s b h", s=seq_len, b=batch_size, h=hidden_size
            )
        else:
            # Switch Transformer top-1 routing
            max_prob, max_idx = torch.max(scores, dim=2)
            max_prob = rearrange(max_prob, "s b -> (s b) 1")
            max_idx = rearrange(max_idx, "s b -> (s b)")
            hidden_states = rearrange(hidden_states, "s b h -> (s b) h")

            for idx, expert in enumerate(self.experts):
                local_idx = (max_idx == idx).nonzero()
                expert_output = expert(
                    hidden_states[local_idx, :],
                    attention_mask,
                    inference_params=inference_params,
                )
                output[local_idx, :] = expert_output

            output *= max_prob
            output = rearrange(
                output, "(s b) h -> s b h", s=seq_len, b=batch_size, h=hidden_size
            )

        return output


class xPos(MegatronModule):
    """Extrapolatable Position Embedding (xPos).
    https://arxiv.org/abs/2212.10554

    Takes query, key, and value layers from the attention layer
    of size [s, b, h], and returns a query and key
    of the same size with added rotational position bias.
    """

    def __init__(self):
        super().__init__()
        args = get_args()

        self.xpos_size = args.xpos_size
        theta = 1.0 / (
            10000 ** (torch.arange(0, args.xpos_size, 2).float() / args.xpos_size)
        )
        zeta = (
            torch.arange(0, args.xpos_size, 2) / (args.xpos_size / 2) + args.xpos_gamma
        ) / (1 + args.xpos_gamma)
        self.register_buffer("theta", theta)
        self.register_buffer("zeta", zeta)

        self.seq_len_cache = None
        self.sin_cache = None
        self.cos_cache = None

    def rotate(x: torch.Tensor) -> torch.Tensor:
        x1 = x[..., : x.shape[-1] // 2]
        x2 = x[..., x.shape[-1] // 2 :]
        x_rot, _ = pack([x1, x2], "*")

        return x_rot

    def forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.tensor,
        offset: int = 0,
    ) -> torch.Tensor:
        seq_len = value.shape[0]

        if seq_len != self.seq_len_cache:
            self.seq_len_cache = seq_len
            t = torch.arange(value.shape[0], device=value.device).type_as(self.theta)
            freq = einsum(t, self.theta, "i, j -> i j")
            emb, _ = pack([freq, freq], "*").to(value.device)
            self.sin_cache = emb.sin()[:, None, None, :]
            self.cos_cache = emb.cos()[:, None, None, :]

        query_rot = query[..., : self.xpos_size]
        query_pass = query[..., self.xpos_size :]
        key_rot = key[..., : self.xpos_size]
        key_pass = key[..., self.xpos_size :]

        sin = self.sin_cache[offset : query_rot.shape[0] + offset, ...]
        cos = self.cos_cache[offset : query_rot.shape[0] + offset, ...]
        query = (self.rotate(query) * sin) + (query_rot * cos) * self.zeta
        key = (self.rotate(key) * sin) + (key_rot * cos) * (self.zeta**-1)
        query, _ = pack([query, query_pass], "*")
        key, _ = pack([key, key_pass], "*")

        return query, key


class NGrammer(MegatronModule):
    """N-Grammer layer. https://arxiv.org/abs/2207.06366

    Takes hidden states of size [s, b, h], fuses them with learned bi-gram
    latent representations, and returns tensor of the same size.
    """

    def __init__(self):
        super().__init__()
        args = get_args()

        self.ngrammer_size = args.hidden_size * args.ngrammer_size
        self.vocab_size = args.hidden_size * 256
        self.num_clusters = args.ngrammer_num_clusters
        self.num_heads = args.ngrammer_num_heads
        self.dim_per_head = self.ngrammer_size / args.ngrammer_num_heads
        self.decay = args.ngrammer_decay
        self.eps = args.ngrammer_epsilon
        self.concat = args.ngrammer_concat

        self.ngram_layernorm = LayerNorm(
            args.ngrammer_size,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )
        self.embed_layernorm = LayerNorm(
            args.ngrammer_dim_per_head,
            eps=args.layernorm_epsilon,
            no_persist_layer_norm=args.no_persist_layer_norm,
            sequence_parallel=args.sequence_parallel,
        )

        self.ngram_embed = torch.nn.Embedding(
            args.ngrammer_vocab_size * args.ngrammer_num_heads, args.ngrammer_size
        )

        primes = list(
            sympy.primerange(args.ngrammer_vocab_size + 1, 2 * args.ngrammer_vocab_size)
        )[: args.ngrammer_num_heads]
        self.register_buffer("primes", torch.tensor(primes), persistent=False)
        self.register_buffer(
            "means",
            torch.randn(
                args.ngrammer_num_heads,
                args.ngrammer_clusters,
                args.ngrammer_dim_per_head,
            ),
        )

    def forward(
        self,
        hidden_states: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        segment_pos: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        seq_len, batch_size, hidden_size = hidden_states.shape

        hidden_states = rearrange(
            hidden_states, "s b h -> s b nh hd", nh=self.num_heads, hd=self.dim_per_head
        )

        hidden_states_sq = rearrange(
            (torch.square(hidden_states)).sum(dim=-1), "s b nh hd -> s b nh 1"
        )
        means_sq = rearrange((torch.square(means)).sum(dim=-1), "nh k hd -> 1 1 nh k")
        dists = einsum(x, means, "s b nh hd, nh k hd -> s b nh k") * -2
        dists += hidden_states_sq + means_sq

        cluster_ids = dists.argmin(dim=-1)

        if self.training:
            one_hot = F.one_hot(cluster_ids, self.num_clusters)
            per_cluster = one_hot.sum(dim=(0, 1))
            sum = einsum(
                one_hot.float(), hidden_states, "s b nh k, s b nh hd -> nh k hd"
            )
            new_means = sum / (eps / rearrange(per_cluster, "... -> ... 1"))
            new_means = 1.0 - self.decay * new_means + self.decay * means
            self.means.data.copy_(new_means)

        if cluster_ids.ndim == 2:
            cluster_ids = repeat(cluster_ids, "... -> ... nh", nh=self.num_heads)

        ids_0 = F.pad(cluster_ids.long(), (0, 0, 0, 1))
        ids_1 = F.pad(cluster_ids.long(), (0, 0, 1, 0))

        if segment_pos is not None:
            segment_pos = rearrange(segment_pos, "s b -> s b 1")
            mask = 1 - (segment_pos == 0).long()
            mask = F.pad(mask, (0, 0, 0, 1))
            ids_1 *= mask

        ngram_ids = (ids_0 + ids_1 * self.vocab_size)[:, :-1]

        head_range = 1 + rearrange(
            torch.arange(self.num_heads, device=hidden_states.device), "nh -> 1 1 nh"
        )
        primes = rearrange(primes, "nh -> 1 1 nh")

        ngram_ids = ((ngram_ids * head_range * 2) % primes) % self.vocab_size

        ngram_embeds = self.ngram_layernorm(self.ngram_embeds(ngram_ids))

        hidden_states = self.embed_layernorm(hidden_states)

        if self.concat:
            dim_slice = hidden_states.shape[-1] - ngram_embeds.shape[-1]
            output, _ = pack([hidden_states[..., :dim_slice], ngram_embeds], "*")
        else:
            output = hidden_states + ngram_embeds

        output = rearrange(
            output, "s b nh hd -> s b h", s=seq_len, b=batch_size, h=hidden_size
        )

        if mask is not None:
            output * rearrange(mask, "s b -> s b 1").float()

        return output


class ProductKeyMemory(MegatronModule):
    def __init__(self, init_method: torch.nn.init):
        super().__init__()
        args = get_args()

        self.key_size = args.pkm_key_size
        self.key_half = args.pkm_key_size // 2
        self.num_keys = args.hidden_size
        self.pkm_size = args.hidden_size**2
        self.num_heads = args.pkm_num_heads
        self.topk = args.pkm_topk

        self.keys = torch.nn.Parameter(
            torch.zeros(self.num_heads, self.num_keys, 2, self.key_half)
        )
        self.value_embed = torch.nn.EmbeddingBag(
            self.pkm_size, args.hidden_size, mode="sum", sparse=True
        )
        std = 1.0 / math.sqrt(self.key_half)
        torch.nn.init.uniform_(self.keys, -std, std)
        torch.nn.init.normal_(self.value_embed.weight, std=args.hidden_size**-0.5)

        self.query_proj = torch.nn.Sequential(
            mpu.ColumnParallelLinear(
                args.hidden_size,
                args.pkm_num_heads * args.pkm_key_size,
                bias=False,
                gather_output=False,
                init_method=init_method,
                async_tensor_model_parallel_allreduce=args.async_tensor_model_parallel_allreduce,
                **_args_to_kwargs()
            ),
            torch.nn.BatchNorm1d(args.pkm_num_heads * args.pkm_key_size),
        )

        self.dropout, self.query_dropout, self.value_dropout = [
            (*args.pkm_dropout,)
            if isinstance(args.pkm_dropout, tuple)
            else (args.pkm_dropout for i in range(2))
        ]

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        seq_len, batch_size, hidden_size = hidden_states.shape

        hidden_states = F.dropout(hidden_states, self.dropout, self.training)
        query = self.query_proj(hidden_states)
        query = F.dropout(query, self.query_dropout, self.training)
        query = rearrange(query, "s b h -> x s b nh kh", x=2, nh=self.num_heads, kh=-1)

        product = einsum(query, self.keys, "x s b nh kh , nh nk x kh -> s b nh x nk")
        product = rearrange(product, "s b nh x nk -> (s b nh) k", k=self.topk)
        scores_prod, indices_prod = torch.topk(product, self.topk, dim=-1)

        scores, indices = torch.topk(scores_prod, self.topk, dim=-1)
        indices = indices_prod.gather(-1, indices)

        scores = F.softmax(scores.float(), dim=-1)
        scores, indices = [
            rearrange(x, "(s b nh) k -> (s b) (nh k)", nh=self.num_heads)
            for x in [scores, indices]
        ]

        output = self.value_embed(indices, per_sample_weights=scores)
        output = F.dropout(output, self.value_dropout, self.training)
        output = rearrange(
            output, "(s b) (nh k) -> s b h", s=seq_len, b=batch_size, h=hidden_size
        )

        return output


class DynamicPooling(MegatronModule):
    """Dynamic input pooling layer. https://arxiv.org/abs/2211.09761

    Takes hidden states of shape [s, b, h] and shortens seq_len through
    input pooling using boundaries of shape [b, s] constructed from
    training data. Reduces the time complexity of Transformer by a
    factor of k from O(seq_len^2) to O(seq_len^2 / k^2).
    """

    def __init__(self):
        super().__init__()
        args = get_args()

        self.null = torch.nn.Parameter(torch.Tensor(1, 1, args.hidden_size).zero_())
        torch.nn.init.normal_(self.null)

    def forward(
        self,
        hidden_states: torch.Tensor,
        boundaries: torch.Tensor,
        upsample: bool = False,
    ) -> torch.Tensor:
        num_segments = boundaries.sum(dim=-1).max().item()
        if upsample:
            num_segments += 1

        temp = rearrange(torch.zeros_like(boundaries), "... -> ... 1")
        temp += torch.arange(0, num_segments, device=boundaries.device)

        hh1 = boundaries.cumsum(1)
        if upsample:
            hh1 -= boundaries
        hh1 = rearrange(hh1, "... -> ... 1")

        foo = temp - hh1

        bar = 1 - foo
        bar[foo != 0] = 0
        bar /= bar.sum(dim=2, keepdim=True) + 1e9

        if upsample:
            output = einsum(hidden_states, bar, "sl b h, b s sl -> s b h")
        else:
            output = einsum(hidden_states, bar, "s b h, b s sl -> sl b h")
            output, _ = pack([null.repeat(1, bar, 1), output], "* b h")

        return output


class NoopTransformerLayer(MegatronModule):
    """A single 'no-op' transformer layer.

    The sole purpose of this layer is for when a standalone embedding layer
    is used (i.e., args.standalone_embedding_stage == True). In this case,
    zero transformer layers are assigned when pipeline rank == 0. Additionally,
    when virtual pipeline rank >= 1, zero total model parameters are created
    (virtual rank 0 contains the input embedding). This results in the model's
    input and output tensors being the same, which causes an error when
    performing certain memory optimizations on the output tensor (e.g.,
    deallocating it). Thus, this layer disconnects the input from the output
    via a clone. Since ranks containing a no-op layer are generally under-
    utilized (both compute and memory), there's no worry of any performance
    degredation.
    """

    def __init__(self, layer_number: int):
        super().__init__()
        self.layer_number = layer_number

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        encoder_output: Optional[torch.Tensor] = None,
        enc_dec_attn_mask: Optional[torch.Tensor] = None,
        inference_params: Optional[Callable] = None,
    ) -> torch.Tensor:
        return hidden_states.clone()


def _get_num_layers(
    args, is_encoder_and_decoder_model: bool, is_decoder: bool = False
) -> int:
    """Compute the number of transformer layers resident on the current rank."""
    if mpu.get_pipeline_model_parallel_world_size() > 1:
        if is_encoder_and_decoder_model:
            assert args.pipeline_model_parallel_split_rank is not None

            # When a standalone embedding stage is used, a rank is taken from
            # the encoder's ranks, to be used for the encoder's embedding
            # layer. This way, the rank referenced by the 'split rank' remains
            # the same whether or not a standalone embedding stage is used.
            num_ranks_in_encoder = (
                args.pipeline_model_parallel_split_rank - 1
                if args.standalone_embedding_stage
                else args.pipeline_model_parallel_split_rank
            )
            num_ranks_in_decoder = (
                args.transformer_pipeline_model_parallel_size - num_ranks_in_encoder
            )
            assert args.encoder_num_layers % num_ranks_in_encoder == 0, (
                "encoder_num_layers (%d) must be divisible by number of ranks given to encoder (%d)"
                % (args.encoder_num_layers, num_ranks_in_encoder)
            )
            assert args.decoder_num_layers % num_ranks_in_decoder == 0, (
                "decoder_num_layers (%d) must be divisible by number of ranks given to decoder (%d)"
                % (args.decoder_num_layers, num_ranks_in_decoder)
            )
            if mpu.is_pipeline_stage_before_split():
                num_layers = (
                    0
                    if args.standalone_embedding_stage
                    and mpu.get_pipeline_model_parallel_rank() == 0
                    else args.encoder_num_layers // num_ranks_in_encoder
                )
            else:
                num_layers = args.decoder_num_layers // num_ranks_in_decoder
        else:
            assert args.num_layers == args.encoder_num_layers
            assert (
                args.num_layers % args.transformer_pipeline_model_parallel_size == 0
            ), "num_layers must be divisible by transformer_pipeline_model_parallel_size"

            # When a standalone embedding stage is used, all transformer layers
            # are divided among pipeline rank >= 1, while on pipeline rank 0,
            # ranks either contain the input embedding layer (virtual pp rank 0),
            # or no layers at all (virtual pp rank >= 1).
            num_layers = (
                0
                if args.standalone_embedding_stage
                and mpu.get_pipeline_model_parallel_rank() == 0
                else args.num_layers // args.transformer_pipeline_model_parallel_size
            )
    else:
        if not is_decoder:
            num_layers = args.encoder_num_layers
        else:
            num_layers = args.decoder_num_layers
    return num_layers


def _build_layers(
    args,
    layer_numbers: List,
    init_method: torch.nn.init,
    output_layer_init_method: torch.nn.init,
    model_type: Enum = ModelType.encoder_or_decoder,
    attn_type: Enum = AttnType.self_attn,
    attn_mask_type: Enum = AttnMaskType.padding,
    drop_path_rates: List = 0.0,
):
    def get_MLP(layer_number: int):
        if args.num_experts is not None and layer_number % 2 == 0:
            return SwitchMLP(init_method, output_layer_init_method)
        elif (
            layer_number / layer_numbers[-1:] * 100 == 75
            and args.use_product_key_memory
        ):
            return ProductKeyMemory(init_method)
        else:
            return ParallelMLP(init_method, output_layer_init_method)

    def get_attention(layer_number: int, attn_layers: List):
        if args.num_attn_experts is not None and layer_number % 2 == 0:
            return SwitchAttention(init_method, output_layer_init_method, layer_number)
        elif attn_type == AttnType.self_attn or AttnType.cross_attn:
            return ParallelAttention(
                init_method,
                output_layer_init_method,
                layer_number,
                attn_type=attn_type,
                attn_mask_type=attn_mask_type,
            )
        elif attn_type == AttnType.mega or (
            attn_type == AttnType.memory and layer_number != attn_layers[-1:]
        ):
            return MEGA(
                init_method,
                output_layer_init_method,
                layer_number,
                attn_type=attn_type,
                attn_mask_type=attn_mask_type,
            )
        elif attn_type == AttnType.memory and (
            layer_number == attn_layers[-1:]
            or (
                layer_number / layer_numbers[-1:] * 100 == 75
                and not args.pay_less_attention
            )
        ):
            return MemorizingMEGA(
                init_method,
                output_layer_init_method,
                layer_number,
                attn_type=attn_type,
                attn_mask_type=attn_mask_type,
            )

    if args.transformer_impl != "local":
        return [
            transformer_engine.pytorch.TransformerLayer(
                args.hidden_size,
                args.ffn_hidden_size,
                args.num_attention_heads,
                layernorm_epsilon=args.layernorm_epsilon,
                hidden_dropout=args.hidden_dropout,
                attention_dropout=args.attention_dropout,
                init_method=init_method,
                output_layer_init_method=output_layer_init_method,
                layer_number=layer_number,
                kv_channels=args.kv_channels,
                self_attn_mask_type=attn_mask_type,
                tp_group=mpu.get_tensor_model_parallel_group(),
                get_rng_state_tracker=mpu.get_cuda_rng_tracker,
                fuse_wgrad_accumulation=args.gradient_accumulation_fusion,
                apply_query_key_layer_scaling=args.apply_query_key_layer_scaling,
                attention_softmax_in_fp32=args.attention_softmax_in_fp32,
                seq_length=args.seq_length,
                micro_batch_size=args.micro_batch_size,
                sequence_parallel=args.sequence_parallel,
                params_dtype=args.params_dtype,
                apply_residual_connection_post_layernorm=args.apply_residual_connection_post_layernorm,
                output_layernorm=False,
                layer_type="encoder",
                drop_path_rate=drop_path_rates[i - 1],
                set_parallel_mode=True,
                fuse_qkv_params=True,
            )
            for i in layer_numbers
        ]

    if args.pay_less_attention:
        num_attn_layers = round(self.num_layers / args.par_coefficient)
        attn_dist = round(2 * self.num_layers / 3)
        attn_layers = torch.linspace(1, attn_dist, num_attn_layers, dtype=torch.int)
    else:
        attn_layers = layer_numbers

    layernorm = LayerNorm(
        args.hidden_size,
        eps=args.layernorm_epsilon,
        no_persist_layer_norm=args.no_persist_layer_norm,
        sequence_parallel=args.sequence_parallel,
    )

    layer_list = torch.nn.ModuleList()
    if args.use_ngrammer:
        layer_list.append(NGrammer())
    for i in layer_numbers:
        layer = torch.nn.ModuleList()
        if not args.sub_ln:
            layer.append(layernorm)
        if i in attn_layers:
            layer.append(get_attention(i, attn_layers))
        if drop_path_rates[i] > 0.0:
            layer.append(DropPath(drop_path_rates[i]))
        if not args.sub_ln:
            layer.append(layernorm)
        if model_type == ModelType.encoder_and_decoder and i in attn_layers:
            layer.append(get_attention(i, attn_layers))
            layer.append(layernorm)
        layer.append(get_mlp(i))
        if drop_path_rates[i] > 0.0:
            layer.append(DropPath(drop_path_rates[i]))

        layer_list.append(layer)

    return layer_list


class ParallelTransformer(MegatronModule):
    """Transformer class."""

    def __init__(
        self,
        init_method: torch.nn.init,
        output_layer_init_method: torch.nn.init,
        model_type: Enum = ModelType.encoder_or_decoder,
        layer_type: Enum = LayerType.encoder,
        attn_type: Enum = AttnType.self_attn,
        attn_mask_type: Enum = AttnMaskType.padding,
        post_layer_norm: bool = True,
        pre_process: bool = True,
        post_process: bool = True,
        drop_path_rate: float = 0.0,
    ):
        super(ParallelTransformer, self).__init__()
        args = get_args()

        self.model_type = model_type or args.model_type
        self.layer_type = layer_type
        self.bf16 = args.bf16
        self.fp32_residual_connection = args.fp32_residual_connection
        self.post_layer_norm = post_layer_norm
        self.pre_process = pre_process
        self.post_process = post_process
        self.input_tensor = None
        self.drop_path_rate = drop_path_rate
        self.transformer_impl = args.transformer_impl

        # Store activation checkpoiting flag.
        self.recompute_granularity = args.recompute_granularity
        self.recompute_method = args.recompute_method
        self.recompute_num_layers = args.recompute_num_layers
        self.distribute_saved_activations = (
            args.distribute_saved_activations and not args.sequence_parallel
        )

        self.sequence_parallel = args.sequence_parallel

        # Transformer Engine Init.
        if self.transformer_impl == "transformer_engine":
            global transformer_engine
            import transformer_engine
        self.use_fp8 = args.fp8_e4m3 or args.fp8_hybrid
        self.fp8_recipe = None
        self.fp8_group = mpu.get_data_parallel_group()
        if self.use_fp8:
            if args.fp8_e4m3:
                fp8_format = transformer_engine.common.recipe.Format.E4M3
            elif args.fp8_hybrid:
                fp8_format = transformer_engine.common.recipe.Format.HYBRID
            self.fp8_recipe = transformer_engine.common.recipe.DelayedScaling(
                margin=args.fp8_margin,
                interval=args.fp8_interval,
                fp8_format=fp8_format,
                amax_history_len=args.fp8_amax_history_len,
                amax_compute_algo=args.fp8_amax_compute_algo,
                override_linear_precision=(False, False, not args.fp8_wgrad),
            )

        self.num_microbatches_in_previous_step = -1
        self.microbatch_count = 0
        self.checkpoint_core_attention = args.recompute_granularity == "selective"

        # Number of layers.
        self.num_layers = _get_num_layers(
            args,
            self.model_type == ModelType.encoder_and_decoder,
            layer_type == LayerType.decoder,
        )

        self.pooler = DynamicPooling()
        self.num_unpooled_layers = args.num_unpooled_layers

        self.drop_path_rates = [
            rate.item()
            for rate in torch.linspace(0, self.drop_path_rate, args.num_layers)
        ]

        # Transformer layers.
        if args.virtual_pipeline_model_parallel_size is not None:
            assert args.num_layers % args.virtual_pipeline_model_parallel_size == 0, (
                "num_layers_per_stage must be divisible by "
                "virtual_pipeline_model_parallel_size"
            )
            assert self.model_type != ModelType.encoder_and_decoder
            # Number of layers in each model chunk is the number of layers in the stage,
            # divided by the number of model chunks in a stage.
            self.num_layers = (
                self.num_layers // args.virtual_pipeline_model_parallel_size
            )
            # With 8 layers, 2 stages, and 4 model chunks, we want an assignment of
            # layers to stages like (each list is a model chunk):
            # Stage 0: [0]  [2]  [4]  [6]
            # Stage 1: [1]  [3]  [5]  [7]
            # With 8 layers, 2 stages, and 2 virtual stages, we want an assignment of
            # layers to stages like (each list is a model chunk):
            # Stage 0: [0, 1]  [4, 5]
            # Stage 1: [2, 3]  [6, 7]
            offset = mpu.get_virtual_pipeline_model_parallel_rank() * (
                args.num_layers // args.virtual_pipeline_model_parallel_size
            ) + (mpu.get_pipeline_model_parallel_rank() * self.num_layers)
        else:
            # Each stage gets a contiguous set of layers.
            if (
                self.model_type == ModelType.encoder_and_decoder
                and mpu.get_pipeline_model_parallel_world_size() > 1
            ):
                pipeline_rank = mpu.get_pipeline_model_parallel_rank()
                if layer_type == LayerType.encoder:
                    offset = pipeline_rank * self.num_layers
                else:
                    num_ranks_in_enc = args.pipeline_model_parallel_split_rank
                    offset = (pipeline_rank - num_ranks_in_enc) * self.num_layers
            else:
                offset = mpu.get_pipeline_model_parallel_rank() * self.num_layers

        if self.num_layers == 0:
            # When a standalone embedding stage is used (e.g.,
            # args.standalone_embedding_stage == True), virtual pipeline ranks
            # on pipeline rank 0 will have zero transformer layers assigned to
            # them. This results in the model's input and output tensors to be
            # the same, which will cause failure for certain output tensor
            # optimizations (e.g., pipeline output deallocation). To remedy
            # this, we assign a 'no-op' layer on these ranks, which will
            # disconnect the input tensor from the output tensor.
            self.num_layers = 1
            self.layers = torch.nn.ModuleList([NoopTransformerLayer(1)])
        else:
            self.layers = _build_layers(
                args,
                [(i + 1 + offset) for i in range(self.num_layers)],
                init_method,
                output_layer_init_method,
                model_type,
                attn_type,
                attn_mask_type,
                self.drop_path_rates,
            )

        if self.post_process and self.post_layer_norm:
            # Final layer norm before output.
            self.final_layernorm = LayerNorm(
                args.hidden_size,
                eps=args.layernorm_epsilon,
                no_persist_layer_norm=args.no_persist_layer_norm,
                sequence_parallel=args.sequence_parallel,
            )

        if args.sub_ln:
            for name, p in self.named_parameters():
                if "dense" in name or "v_proj" in name or "h_proj" in name:
                    p.data *= math.sqrt(math.log(self.num_layers * 2))

    def _get_layer(self, layer_number: int) -> torch.nn.ModuleList:
        return self.layers[layer_number]

    def _checkpointed_forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.Tensor,
        encoder_output: torch.Tensor,
        enc_dec_attn_mask: torch.Tensor,
        is_first_microbatch: bool,
    ) -> torch.Tensor:
        """Forward method with activation checkpointing."""

        def custom(start: int, end: int):
            def custom_forward(*inputs):
                x_ = inputs[0]
                attention_mask = inputs[1]
                encoder_output = inputs[2]
                enc_dec_attn_mask = inputs[3]
                for index in range(start, end):
                    layer = self._get_layer(index)
                    x_ = layer(*args, **kwargs)

            def custom_forward_transformer_engine(*args, **kwargs):
                return custom_forward(
                    *args, is_first_microbatch=is_first_microbatch, **kwargs
                )

            if not is_transformer_engine:
                return custom_forward
            else:
                return custom_forward_transformer_engine

        if self.recompute_method == "uniform":
            # Uniformly divide the total number of Transformer layers and checkpoint
            # the input activation of each divided chunk.
            # A method to further reduce memory usage reducing checkpoints.
            l = 0
            while l < self.num_layers:
                if self.transformer_impl == "transformer_engine":
                    hidden_states = transformer_engine.pytorch.distributed.checkpoint(
                        custom(
                            l, l + self.recompute_num_layers, is_transformer_engine=True
                        ),
                        self.distribute_saved_activations,
                        mpu.get_cuda_rng_tracker,
                        mpu.get_tensor_model_parallel_group(),
                        hidden_states,
                        attention_mask,
                        encoder_output,
                        enc_dec_attn_mask,
                    )
                else:
                    hidden_states = mpu.checkpoint(
                        custom(l, l + self.recompute_num_layers),
                        self.distribute_saved_activations,
                        hidden_states,
                        attention_mask,
                        encoder_output,
                        enc_dec_attn_mask,
                    )

                l += self.recompute_num_layers

        elif self.recompute_method == "block":
            # Checkpoint the input activation of only a set number of individual
            # Transformer layers and skip the rest.
            # A method fully use the device memory removing redundant re-computation.
            for l in range(self.num_layers):
                if l < self.recompute_num_layers:
                    if self.transformer_impl == "transformer_engine":
                        hidden_states = (
                            transformer_engine.pytorch.distributed.checkpoint(
                                custom(l, l + 1, is_transformer_engine=True),
                                self.distribute_saved_activations,
                                mpu.get_cuda_rng_tracker,
                                mpu.get_tensor_model_parallel_group(),
                                hidden_states,
                                attention_mask,
                                encoder_output,
                                enc_dec_attn_mask,
                            )
                        )
                    else:
                        hidden_states = mpu.checkpoint(
                            custom(l, l + 1),
                            self.distribute_saved_activations,
                            hidden_states,
                            attention_mask,
                            encoder_output,
                            enc_dec_attn_mask,
                        )
                else:
                    if self.transformer_impl == "transformer_engine":
                        hidden_states = custom(l, l + 1, is_transformer_engine=True)(
                            hidden_states,
                            attention_mask,
                            encoder_output,
                            enc_dec_attn_mask,
                        )
                    else:
                        hidden_states = custom(l, l + 1)(
                            hidden_states,
                            attention_mask,
                            encoder_output,
                            enc_dec_attn_mask,
                        )
        else:
            raise ValueError("Invalid activation recompute method.")

        return hidden_states

    def set_input_tensor(self, input: torch.Tensor):
        """Set input tensor to be used instead of forward()'s input.

        When doing pipeline parallelism the input from the previous
        stage comes from communication, not from the input, so the
        model's forward_step_func won't have it. This function is thus
        used by internal code to bypass the input provided by the
        forward_step_func"""

    self.input_tensor = input

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: torch.Tensor,
        encoder_output: Optional[torch.Tensor] = None,
        enc_dec_attn_mask: Optional[torch.Tensor] = None,
        inference_params: Optional[Callable] = None,
        boundaries: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        # hidden_states: [s, b, h]

        # Checks.
        if inference_params:
            assert (
                self.recompute_granularity is None
            ), "Inference does not work with activation checkpointing"

        if not self.pre_process:
            # See set_input_tensor()
            hidden_states = self.input_tensor

        # Viewless tensor.
        # - We only need to create a viewless tensor in the case of micro batch
        #   size (mbs) == 1, since in this case, 'hidden_states.transpose()'
        #   above creates a view tensor, and '.contiguous()' is a pass-through.
        #   For mbs >= 2, '.contiguous()' creates a new tensor, eliminating
        #   the need to make it viewless.
        #
        #   However, we don't explicitly check mbs == 1 here because
        #   make_viewless_tensor() has negligible overhead when its input
        #   is already viewless.
        #
        # - For the 'else' case above, calling make_viewless_tensor() here is
        #   likely redundant, since p2p_communication.py (likely originator)
        #   already creates viewless tensors. That said, make_viewless_tensor()
        #   is called here to be future-proof and corner-case-proof.
        hidden_states = core.utils.make_viewless_tensor(
            hidden_states,
            requires_grad=True,
            keep_graph=True,
        )

        if self.sequence_parallel:
            rng_context = mpu.get_cuda_rng_tracker().fork()
        else:
            rng_context = nullcontext()

        with rng_context:
            # The fp8_autocast context manager is a no-op when enabled=True
            # The if...else serves to short circuit name resolution for fp8_autocast
            with transformer_engine.pytorch.fp8_autocast(
                enabled=self.use_fp8,
                fp8_recipe=self.fp8_recipe,
                fp8_group=self.fp8_group,
            ) if self.use_fp8 else nullcontext():
                # Determine if the current iteration is first microbatch
                if self.num_microbatches_in_previous_step != get_num_microbatches():
                    self.microbatch_count = (
                        0  # Reset count on new batch size rampup interval
                    )
                self.num_microbatches_in_previous_step = get_num_microbatches()
                is_first_microbatch = (
                    self.microbatch_count % get_num_microbatches() == 0
                )

                # Forward pass.
                if self.recompute_granularity == "full":
                    hidden_states = self._checkpointed_forward(
                        hidden_states,
                        attention_mask,
                        encoder_output,
                        enc_dec_attn_mask,
                        is_first_microbatch,
                    )
                else:
                    forward_kwargs = {
                        "encoder_output": encoder_output,
                        "enc_dec_attn_mask": enc_dec_attn_mask,
                        "inference_params": inference_params,
                    }

                    if self.transformer_impl == "transformer_engine":
                        forward_kwargs["is_first_microbatch"] = is_first_microbatch
                        forward_kwargs[
                            "checkpoint_core_attention"
                        ] = self.checkpoint_core_attention

                    for index in range(self.num_layers):
                        layer = self._get_layer(index)

                        hidden_states = layer(
                            hidden_states, attention_mask, **forward_kwargs
                        )

                # Skip counter update for eval and activation checkpointing
                if torch.is_grad_enabled() and self.training:
                    self.microbatch_count += 1

            # Forward pass.
            if self.recompute_granularity == "full":
                hidden_states = self._checkpointed_forward(
                    hidden_states, attention_mask, encoder_output, enc_dec_attn_mask
                )
            else:
                for index in range(self.num_layers):
                    layer = self._get_layer(index)
                    residual = hidden_states

                    if index - 1 == self.num_unpooled_layers and boundaries is not None:
                        hidden_states = self.pooler(hidden_states, boundaries)
                    elif (
                        self.num_layers - index == self.num_unpooled_layers
                        and boundaries is not None
                    ):
                        hidden_states = self.pooler(
                            hidden_states, boundaries, upsample=True
                        )
                        hidden_states += residual

                    for sublayer in layer:
                        hidden_states = sublayer(
                            hidden_states,
                            attention_mask=attention_mask,
                            encoder_output=encoder_output,
                            enc_dec_attn_mask=enc_dec_attn_mask,
                            residual_attention=residual_attention,
                            inference_params=inference_params,
                        )

        # Final layer norm.
        if self.post_process and self.post_layer_norm:
            hidden_states = self.final_layernorm(hidden_states)

        return hidden_states
