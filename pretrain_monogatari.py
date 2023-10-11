# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.

"""Pretrain Monogatari"""

import math
from functools import partial
from typing import Iterable

import deepspeed
import torch
from deepspeed.runtime.utils import see_memory_usage
from einops import pack

from megatron import get_args, get_timers, get_tokenizer, print_rank_0
from megatron.core import mpu
from megatron.data.monogatari_dataset import build_train_valid_test_datasets
from megatron.model import ModelType, MonogatariModel
from megatron.training import pretrain
from megatron.utils import (
    average_losses_across_data_parallel_group,
    get_ltor_masks_and_position_ids,
)


def model_provider(pre_process=True, post_process=True):
    """Build the model."""

    print_rank_0(">Building Monogatari...")
    see_memory_usage("Memory usage before building model:", force=True)
    with deepspeed.zero.Init(
        data_parallel_group=mpu.get_data_parallel_group(),
        remote_device=None if args.remote_device == "none" else args.remote_device,
        config_dict_or_path=args.deepspeed_config,
        enabled=args.zero_stage == 3,
        mpu=mpu,
    ):
        try:
            model = torch.compile(MonogatariModel(), mode="max-autotune")
        except:
            model = MonogatariModel(
                num_tokentypes=0,
                parallel_output=True,
                pre_process=pre_process,
                post_process=post_process,
            )
        finally:
            print_rank_0(">Finished building Monogatari.")
            see_memory_usage("Memory usage after building model:", force=True)

        model._megatron_batch_fn = get_batch

    return model


def get_batch(data):
    """Generate a batch"""
    args = get_args()
    tokenizer = get_tokenizer()

    # Items and their type.
    keys = [
        "text",
        "aux_text",
        "aux_types",
        "aux_labels",
        "aux_loss_mask",
        "aux_padding_mask",
        "is_random",
        "masked_ids",
    ]
    datatype = torch.int64

    # Broadcast data.
    if isinstance(data, Iterable):
        data = next(data)
    else:
        data = data
    data_b = mpu.broadcast_data(keys, data, datatype)

    # Unpack.
    tokens_ = data_b["text"].long()
    labels = tokens_[:, 1:].contiguous()
    tokens = tokens_[:, :-1].contiguous()
    aux_tokens = data_b["aux_text"].long()
    aux_labels = data_b["aux_labels"].long()
    aux_loss_mask = data_b["aux_loss_mask"].long()
    padding_mask = data_b["padding_mask"].long()
    sentence_order = data_b["is_random"].long()
    masked_ids = data_b["masked_positions"].long()

    tokens, ps = pack([tokens, aux_tokens], "*")

    # Get the masks and postition ids.
    attention_mask, loss_mask, position_ids = get_ltor_masks_and_position_ids(
        tokens,
        tokenizer.eod,
        args.reset_position_ids,
        args.reset_attention_mask,
        args.eod_mask_loss,
        bos_token=tokenizer.bos,
    )

    boundaries = torch.zeros_like(tokens, dtype=torch.bool)
    boundaries |= tokens == tokenizer.sep

    return (
        tokens,
        labels,
        masked_ids,
        loss_mask,
        attention_mask,
        position_ids,
        aux_labels,
        aux_loss_mask,
        padding_mask,
        sentence_order,
        boundaries,
    )


def loss_func(loss_mask, *output_tensor):
    lm_loss, aux_loss, ct_loss, taco_loss = *output_tensor
    loss_mask = loss_mask.view(-1).float()
    lm_loss = torch.sum(lm_loss.view(-1).float() * loss_mask) / loss_mask.sum()

    # Reduce loss for logging.
    averaged_loss = average_losses_across_data_parallel_group(
        [lm_loss, aux_loss, ct_loss, taco_loss]
    )

    return lm_loss, {
        "lm loss": averaged_loss[0],
        "aux loss": averaged_loss[1],
        "contrastive token loss": averaged_loss[2],
        "token alignment loss": averaged_loss[3],
    }


def forward_step(data_iterator, model):
    """Forward step."""
    args = get_args()
    timers = get_timers()

    # Get the batch.
    timers("batch-generator", log_level=2).start()
    tokens, labels, masked_ids, loss_mask, attention_mask, position_ids,
    aux_labels, aux_loss_mask, padding_mask, sentence_order, boundaries = get_batch(
        data_iterator
    )
    timers("batch-generator").stop()

    if args.curriculum_learning:
        args.curriculum_seqlen = tokens.size()[1]
        if (
            hasattr(args, "curriculum_learning_seqlen_type")
            and args.curriculum_learning_seqlen_type == "seqlen_reshape"
        ):
            args.curriculum_learning_numel = torch.numel(tokens)

    output_tensor = model(
        tokens,
        position_ids,
        masked_ids,
        attention_mask,
        padding_mask,
        labels,
        aux_labels,
        boundaries,
    )

    return output_tensor, partial(loss_func, loss_mask, aux_loss_mask, sentence_order)


def train_valid_test_datasets_provider(train_val_test_num_samples):
    """Build train, valid, and test datasets."""
    args = get_args()

    print_rank_0(">Building train, validation, and test datasets for Monogatari...")
    train_ds, valid_ds, test_ds = build_train_valid_test_datasets(
        data_prefix=args.data_path,
        data_impl=args.data_impl,
        splits_string=args.split,
        train_valid_test_num_samples=train_val_test_num_samples,
        seq_length=args.seq_length,
        seed=args.seed,
        skip_warmup=(not args.mmap_warmup),
        train_data_prefix=args.train_data_path,
        valid_data_prefix=args.valid_data_path,
        test_data_prefix=args.test_data_path,
    )
    print_rank_0(">Finished creating datasets.")

    return train_ds, valid_ds, test_ds


def data_post_process(data, data_sampler_state_dict):
    args = get_args()
    if args.data_efficiency_curriculum_learning:
        if "seqlen_truncate" in data_sampler_state_dict["current_difficulties"]:
            args.data_efficiency_curriculum_learning_seqlen_type = "seqlen_truncate"
            current_seqlen = data_sampler_state_dict["current_difficulties"][
                "seqlen_truncate"
            ]
            if current_seqlen < args.seq_length:
                data["text"] = data["text"][:, : (current_seqlen + 1)].contiguous()
        elif "seqlen_reshape" in data_sampler_state_dict["current_difficulties"]:
            args.data_efficiency_curriculum_learning_seqlen_type = "seqlen_reshape"
            current_seqlen = data_sampler_state_dict["current_difficulties"][
                "seqlen_reshape"
            ]
            if current_seqlen < args.seq_length:
                orig_num_token = torch.numel(data["text"])
                reshape_len = (data["text"].size()[1] // (current_seqlen + 1)) * (
                    current_seqlen + 1
                )
                data["text"] = torch.cat(
                    (
                        data["text"][:, :reshape_len]
                        .contiguous()
                        .view(-1, current_seqlen + 1),
                        data["text"][:, -(current_seqlen + 1) :],
                    ),
                    0,
                ).contiguous()
                num_row = math.ceil(orig_num_token / (current_seqlen + 1))
                num_row = min(num_row, data["text"].size()[0])
                if num_row > 1 and num_row % 2 != 0:
                    num_row -= 1
                data["text"] = data["text"][:num_row, :].contiguous()
        else:
            args.data_efficiency_curriculum_learning_seqlen_type = None

    return data


if __name__ == "__main__":

    pretrain(
        train_valid_test_datasets_provider,
        model_provider,
        ModelType.encoder_or_decoder,
        forward_step,
        args_defaults={"tokenizer_type": "YTTMTokenizer"},
        data_post_process=data_post_process,
    )
