# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""Utilities for models."""

import math

import torch

from megatron import get_args


def init_method_normal(sigma):
    """Init method based on N(0, sigma)."""

    def init_(tensor):
        return torch.nn.init.normal_(tensor, mean=0.0, std=sigma)

    return init_


def scaled_init_method_normal(sigma, num_layers):
    """Init method based on N(0, sigma/sqrt(2*num_layers)."""
    std = sigma / math.sqrt(2.0 * num_layers)

    def init_(tensor):
        return torch.nn.init.normal_(tensor, mean=0.0, std=std)

    return init_


def attention_mask_func(attention_scores, attention_mask):
    attention_scores.masked_fill_(attention_mask, -10000.0)
    return attention_scores


def get_linear_layer(rows, columns, init_method):
    """Simple linear layer with weight initialization."""
    layer = torch.nn.Linear(rows, columns)
    if get_args().perform_initialization:
        init_method(layer.weight)
    with torch.no_grad():
        layer.bias.zero_()
    return layer


@torch.jit.script
def gelu_impl(x):
    """OpenAI's gelu implementation."""
    return (
        0.5 * x * (1.0 + torch.tanh(0.7978845608028654 * x * (1.0 + 0.044715 * x * x)))
    )


def openai_gelu(x):
    return gelu_impl(x)


# This is actually Python equivalent of torch.nn.functional.gelu(), also with type hints for ONNX exporter
@torch.jit.script
def erf_gelu(x):
    return (
        x
        * 0.5
        * (
            torch.erf(x / 1.41421).to(dtype=x.dtype)
            + torch.ones_like(x).to(dtype=x.dtype)
        )
    )


def sampler(
    labels: torch.Tensor,
    window_size: int = 5,
    num_samples: int = 5,
    positive: bool = True,
) -> torch.Tensor:
    assert window_size % 2 == 1
    seq_len, batch_size = labels.shape

    row_shape = (seq_len, 1, num_samples)

    if positive:
        row_idx = [
            torch.full(row_shape, idx, dtype=torch.long) for idx in range(batch_size)
        ]
        row_idx, _ = pack([row_idx, 0], "s * n")

        col_shape = (1, batch_size, num_samples)
        col_idx = [
            (
                torch.randint(window_size - 1, col_shape, dtype=torch.long)
                + window_size // 2
                + 1
            )
            % window_size
            - window_size // 2
            + idx
            for idx in range(seq_len)
        ]
        col_idx, _ = pack([col_idx, 1], "* b n")

        backup_idx = [
            (torch.randint(seq_len - 1, col_shape, dtype=torch.long) + idx + 1)
            % seq_len
            for idx in range(seq_len)
        ]
        backup_idx, _ = pack([backup_idx, 1], "* b n")

        col_idx = torch.where(col_idx < 0, backup_idx, col_idx)
        col_idx = torch.where(sample_col_idx >= seq_len, backup_idx, sample_col_idx)
    else:
        row_idx = [
            (torch.randint(batch_size - 1, row_shape, dtype=torch.long) + idx + 1)
            % batch_size
            for idx in range(batch_size)
        ]
        row_idx, _ = pack([row_idx, 0], "s * n")

        col_shape = (seq_len, batch_size, num_samples)
        col_idx = torch.randint(seq_len, col_shape, dtype=torch.long)

    return row_idx, col_idx
