# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""Monogatari dataset."""

import os
import time

import numpy as np
import torch
from deepspeed.accelerator import get_accelerator

from megatron import get_tokenizer, print_rank_0
from megatron.core import mpu
from megatron.data.blendable_dataset import BlendableDataset
from megatron.data.dataset_utils import (
    create_masked_lm_predictions,
    get_datasets_weights_and_num_samples,
    get_samples_mapping,
    get_train_valid_test_split_,
)
from megatron.data.indexed_dataset import make_dataset as make_indexed_dataset


class MonogatariDataset(torch.utils.data.Dataset):
    def __init__(
        self,
        name,
        data_prefix,
        documents,
        indexed_dataset,
        num_samples,
        seq_length,
        seed,
        masked_lm_prob,
        binary_head,
    ):

        self.name = name
        self.indexed_dataset = indexed_dataset

        # Checks
        assert np.min(documents) >= 0
        assert np.max(documents) < indexed_dataset.sizes.shape[0]

        # Build index mappings.
        self.doc_idx, self.sample_idx, self.shuffle_idx = _build_index_mappings(
            name,
            data_prefix,
            documents,
            indexed_dataset.sizes,
            num_samples,
            seq_length / 2,
            seed,
        )

        tokens_per_epoch = _num_tokens(documents, sizes)
        num_epochs = _num_epochs(tokens_per_epoch, seq_length, num_samples)

        self.sample_mapping = get_samples_mapping(
            indexed_dataset,
            data_prefix,
            num_epochs,
            num_samples,
            seq_length / 2 - 3,  # account for added tokens
            0,
            seed,
            name,
            binary_head,
        )

        tokenizer = get_tokenizer()
        self.vocab_id_list = list(tokenizer.inv_vocab.keys())
        self.vocab_id_to_token_dict = tokenizer.inv_vocab
        self.cls_id = tokenizer.cls
        self.sep_id = tokenizer.sep
        self.mask_id = tokenizer.mask
        self.pad_id = tokenizer.pad

    def __len__(self):
        # -1 is due to data structure used to retieve the index:
        #    sample i --> [sample_idx[i], sample_idx[i+1])
        return self.sample_mapping.shape[0] + self.sample_idx.shape[0] - 1

    def __getitem__(self, idx):
        # Get the shuffled index.
        idx = self.shuffle_idx[idx]
        # Start and end documents and offsets.
        doc_index_f = self.sample_idx[idx][0]
        doc_index_l = self.sample_idx[idx + 1][0]
        offset_f = self.sample_idx[idx][1]
        offset_l = self.sample_idx[idx + 1][1]
        # If we are within the same document, just extract the chunk.
        if doc_index_f == doc_index_l:
            sample = self.indexed_dataset.get(
                self.doc_idx[doc_index_f],
                offset=offset_f,
                length=offset_l - offset_f + 1,
            )
        else:
            # Otherwise, get the rest of the initial document.
            sample_list = [
                self.indexed_dataset.get(self.doc_idx[doc_index_f], offset=offset_f)
            ]
            # Loop over all in between documents and add the entire document.
            for i in range(doc_index_f + 1, doc_index_l):
                sample_list.append(self.indexed_dataset.get(self.doc_idx[i]))
            # And finally add the relevant portion of last document.
            sample_list.append(
                self.indexed_dataset.get(self.doc_idx[doc_index_l], length=offset_l + 1)
            )
            sample = np.concatenate(sample_list)

        start_idx, end_idx, seq_length = self.sample_mapping[idx]
        aux_sample = [self.indexed_dataset[i] for i in range(start_idx, end_idx)]
        np_rng = np.random.RandomState(seed=((seed + idx) % 2**32))

        aux_sample = build_training_sample(
            aux_sample,
            seq_length,
            seq_length,
            self.vocab_id_list,
            self.vocab_id_to_token_dict,
            self.cls_id,
            self.sep_id,
            self.mask_id,
            self.pad_id,
            masked_lm_prob,
            np_rng,
            binary_head,
        )

        return {"text": np.array(sample, dtype=np.int64)} + aux_sample


def build_training_sample(
    sample,
    target_seq_length,
    max_seq_length,
    vocab_id_list,
    vocab_id_to_token_dict,
    cls_id,
    sep_id,
    mask_id,
    pad_id,
    masked_lm_prob,
    np_rng,
    binary_head,
):
    """Build training sample.

    Arguments:
        sample: A list of sentences in which each sentence is a list of token ids.
        target_seq_length: Desired sequence length.
        max_seq_length: Maximum length of the sequence. All values are padded to
            this length.
        vocab_id_list: List of vocabulary ids. Used to pick a random id.
        vocab_id_to_token_dict: A dictionary from vocab ids to text tokens.
        cls_id: Start of example id.
        sep_id: Separator id.
        mask_id: Mask token id.
        pad_id: Padding token id.
        masked_lm_prob: Probability to mask tokens.
        np_rng: Random number genenrator. Note that this rng state should be
            numpy and not python since python randint is inclusive for
            the upper bound whereas numpy is exclusive.
    """

    if binary_head:
        # We assume that we have at least two sentences in the sample
        assert len(sample) > 1
    assert target_seq_length <= max_seq_length

    # Divide sample into two segments (A and B).
    if binary_head:
        tokens_a, tokens_b, is_next_random = get_a_and_b_segments(sample, np_rng)
    else:
        tokens_a = []
        for j in range(len(sample)):
            tokens_a.extend(sample[j])
        tokens_b = []
        is_next_random = False

    # Truncate to `target_sequence_length`.
    max_num_tokens = target_seq_length
    truncated = truncate_segments(
        tokens_a, tokens_b, len(tokens_a), len(tokens_b), max_num_tokens, np_rng
    )

    # Build tokens and toketypes.
    tokens, tokentypes = create_tokens_and_tokentypes(
        tokens_a, tokens_b, cls_id, sep_id
    )

    # Masking.
    max_predictions_per_seq = masked_lm_prob * max_num_tokens
    (tokens, masked_positions, masked_labels, _, _) = create_masked_lm_predictions(
        tokens,
        vocab_id_list,
        vocab_id_to_token_dict,
        masked_lm_prob,
        cls_id,
        sep_id,
        mask_id,
        max_predictions_per_seq,
        np_rng,
    )

    # Padding.
    (
        tokens_np,
        tokentypes_np,
        labels_np,
        padding_mask_np,
        loss_mask_np,
    ) = pad_and_convert_to_numpy(
        tokens, tokentypes, masked_positions, masked_labels, pad_id, max_seq_length
    )

    train_sample = {
        "aux_text": tokens_np,
        "aux_types": tokentypes_np,
        "aux_labels": labels_np,
        "aux_loss_mask": loss_mask_np,
        "aux_padding_mask": padding_mask_np,
        "is_random": int(is_next_random),
        "truncated": int(truncated),
        "masked_positions": masked_positions,
    }

    return train_sample


def pad_and_convert_to_numpy(
    tokens, tokentypes, masked_positions, masked_labels, pad_id, max_seq_length
):
    """Pad sequences and convert them to numpy."""

    # Some checks.
    num_tokens = len(tokens)
    padding_length = max_seq_length - num_tokens
    assert padding_length >= 0
    assert len(tokentypes) == num_tokens
    assert len(masked_positions) == len(masked_labels)

    # Tokens and token types.
    filler = [pad_id] * padding_length
    tokens_np = np.array(tokens + filler, dtype=np.int64)
    tokentypes_np = np.array(tokentypes + filler, dtype=np.int64)

    # Padding mask.
    padding_mask_np = np.array([1] * num_tokens + [0] * padding_length, dtype=np.int64)

    # Lables and loss mask.
    labels = [-1] * max_seq_length
    loss_mask = [0] * max_seq_length
    for i in range(len(masked_positions)):
        assert masked_positions[i] < num_tokens
        labels[masked_positions[i]] = masked_labels[i]
        loss_mask[masked_positions[i]] = 1
    labels_np = np.array(labels, dtype=np.int64)
    loss_mask_np = np.array(loss_mask, dtype=np.int64)

    return tokens_np, tokentypes_np, labels_np, padding_mask_np, loss_mask_np


def build_train_valid_test_datasets(
    data_prefix,
    data_impl,
    splits_string,
    train_valid_test_num_samples,
    seq_length,
    seed,
    skip_warmup,
    train_data_prefix=None,
    valid_data_prefix=None,
    test_data_prefix=None,
):
    """Build train, valid, and test datasets."""

    if data_prefix:
        print_rank_0("Single data path provided for train, valid & test")
        # Single dataset.
        if len(data_prefix) == 1:
            return _build_train_valid_test_datasets(
                data_prefix[0],
                data_impl,
                splits_string,
                train_valid_test_num_samples,
                seq_length,
                seed,
                skip_warmup,
            )

        # Blending dataset.
        # Parse the values.
        output = get_datasets_weights_and_num_samples(
            data_prefix, train_valid_test_num_samples
        )
        prefixes, weights, datasets_train_valid_test_num_samples = output

        # Build individual datasets.
        train_datasets = []
        valid_datasets = []
        test_datasets = []
        for i in range(len(prefixes)):
            train_ds, valid_ds, test_ds = _build_train_valid_test_datasets(
                prefixes[i],
                data_impl,
                splits_string,
                datasets_train_valid_test_num_samples[i],
                seq_length,
                seed,
                skip_warmup,
            )
            if train_ds:
                train_datasets.append(train_ds)
            if valid_ds:
                valid_datasets.append(valid_ds)
            if test_ds:
                test_datasets.append(test_ds)

        # Blend.
        blending_train_dataset = None
        if train_datasets:
            blending_train_dataset = BlendableDataset(train_datasets, weights)
        blending_valid_dataset = None
        if valid_datasets:
            blending_valid_dataset = BlendableDataset(valid_datasets, weights)
        blending_test_dataset = None
        if test_datasets:
            blending_test_dataset = BlendableDataset(test_datasets, weights)

        return (blending_train_dataset, blending_valid_dataset, blending_test_dataset)
    else:
        print_rank_0(
            "Separate data paths provided for train, valid & test. Split string will be ignored."
        )

        train_dataset, valid_dataset, test_dataset = None, None, None
        # Single dataset.
        if train_data_prefix is not None:
            train_dataset = build_dataset(
                "train",
                train_data_prefix,
                data_impl,
                train_valid_test_num_samples[0],
                seq_length,
                seed,
                skip_warmup,
            )

        if valid_data_prefix is not None:
            valid_dataset = build_dataset(
                "valid",
                valid_data_prefix,
                data_impl,
                train_valid_test_num_samples[1],
                seq_length,
                seed,
                False,
            )

        if test_data_prefix is not None:
            test_dataset = build_dataset(
                "test",
                test_data_prefix,
                data_impl,
                train_valid_test_num_samples[2],
                seq_length,
                seed,
                False,
            )

        return (train_dataset, valid_dataset, test_dataset)


def build_dataset(
    dataset_name, data_prefix, data_impl, num_samples, seq_length, seed, skip_warmup
):
    dataset = None
    if len(data_prefix) == 1:
        dataset = _build_dataset(
            dataset_name,
            data_prefix[0],
            data_impl,
            num_samples,
            seq_length,
            seed,
            skip_warmup,
        )
    else:
        # Blending dataset.
        # Parse the values.
        output = get_datasets_weights_and_num_samples(data_prefix, num_samples)
        prefixes, weights, dataset_num_samples = output

        # Build individual datasets.
        datasets = []
        for i in range(len(prefixes)):
            ds = _build_dataset(
                dataset_name,
                prefixes[i],
                data_impl,
                dataset_num_samples[i],
                seq_length,
                seed,
                skip_warmup,
            )
            if ds:
                datasets.append(ds)

        if datasets:
            dataset = BlendableDataset(datasets, weights)

    return dataset


def _build_dataset(
    dataset_name, data_prefix, data_impl, num_samples, seq_length, seed, skip_warmup
):
    """
    Build dataset. This method is called when individual
    train, valid, test datasets are provided
    """

    # Indexed dataset.
    indexed_dataset = get_indexed_dataset_(data_prefix, data_impl, skip_warmup)

    total_num_of_documents = indexed_dataset.sizes.shape[0]

    print_rank_0(f">>>{dataset_name}:")
    print_rank_0(
        f">>>document indices in [0, {total_num_of_documents}) total of {total_num_of_documents} documents"
    )

    documents = np.arange(start=0, stop=total_num_of_documents, step=1, dtype=np.int32)

    dataset = MonogatariDataset(
        dataset_name,
        data_prefix,
        documents,
        indexed_dataset,
        num_samples,
        seq_length,
        seed,
    )

    return dataset


def _build_train_valid_test_datasets(
    data_prefix,
    data_impl,
    splits_string,
    train_valid_test_num_samples,
    seq_length,
    seed,
    skip_warmup,
):
    """Build train, valid, and test datasets."""

    # Indexed dataset.
    indexed_dataset = get_indexed_dataset_(data_prefix, data_impl, skip_warmup)

    total_num_of_documents = indexed_dataset.sizes.shape[0]
    splits = get_train_valid_test_split_(splits_string, total_num_of_documents)

    # Print stats about the splits.
    print_rank_0(" > dataset split:")

    def print_split_stats(name, index):
        print_rank_0(f">>>{name}:")
        print_rank_0(
            f">>>document indices in [{splits[index]}, \
            {splits[index + 1]}) total of {splits[index + 1] - splits[index]} documents"
        )

    print_split_stats("train", 0)
    print_split_stats("validation", 1)
    print_split_stats("test", 2)

    def build_dataset(index, name):
        dataset = None
        if splits[index + 1] > splits[index]:
            documents = np.arange(
                start=splits[index], stop=splits[index + 1], step=1, dtype=np.int32
            )
            dataset = MonogatariDataset(
                name,
                data_prefix,
                documents,
                indexed_dataset,
                train_valid_test_num_samples[index],
                seq_length,
                seed,
            )
        return dataset

    train_dataset = build_dataset(0, "train")
    valid_dataset = build_dataset(1, "valid")
    test_dataset = build_dataset(2, "test")

    return (train_dataset, valid_dataset, test_dataset)


def get_indexed_dataset_(data_prefix, data_impl, skip_warmup):
    """Build indexed dataset."""
    print_rank_0(" > building dataset index ...")

    start_time = time.time()
    indexed_dataset = make_indexed_dataset(data_prefix, data_impl, skip_warmup)
    print_rank_0(
        f">Finished creating indexed dataset in {time.time() - start_time:4f} seconds"
    )
    print_rank_0(f">>>Number of documents: {indexed_dataset.sizes.shape[0]}")

    return indexed_dataset


def _build_index_mappings(
    name, data_prefix, documents, sizes, num_samples, seq_length, seed
):
    """Build doc-idx, sample-idx, and shuffle-idx.
    doc-idx: is an array (ordered) of documents to be used in training.
    sample-idx: is the start document index and document offset for each
       training sample.
    shuffle-idx: maps the sample index into a random index into sample-idx.
    """
    # Number of tokens in each epoch and number of required epochs.
    tokens_per_epoch = _num_tokens(documents, sizes)
    num_epochs = _num_epochs(tokens_per_epoch, seq_length, num_samples)
    # rng state
    np_rng = np.random.RandomState(seed=seed)

    # Filename of the index mappings.
    _filename = data_prefix
    _filename += f"_{name}_indexmap"
    _filename += f"_{num_samples}ns"
    _filename += f"_{seq_lenth}sl"
    _filename += f"_{seed}s"
    doc_idx_filename = _filename + "_doc_idx.npy"
    sample_idx_filename = _filename + "_sample_idx.npy"
    shuffle_idx_filename = _filename + "_shuffle_idx.npy"

    # Build the indexed mapping if not exist.
    if torch.distributed.get_rank() == 0:
        if (
            (not os.path.isfile(doc_idx_filename))
            or (not os.path.isfile(sample_idx_filename))
            or (not os.path.isfile(shuffle_idx_filename))
        ):

            print_rank_0(
                " > WARNING: could not find index map files, building "
                "the indices on rank 0 ..."
            )

            # For the last epoch, decide whether include the entire epoch
            # in the global shuffle or not.

            # If we need only one epoch, then separating last epoch  does
            # not mean anything.
            if num_epochs == 1:
                separate_last_epoch = False
                print(
                    " > only one epoch required, setting "
                    "separate_last_epoch to False",
                    flush=True,
                )

            else:
                # Get the number of samples for the last epoch
                num_samples_from_epochs_minus_one = (
                    (num_epochs - 1) * tokens_per_epoch - 1
                ) // seq_length
                last_epoch_num_samples = num_samples - num_samples_from_epochs_minus_one
                assert (
                    last_epoch_num_samples >= 0
                ), "last epoch number of samples should be non-negative."
                num_samples_per_epoch = (tokens_per_epoch - 1) // seq_length
                assert last_epoch_num_samples < (
                    num_samples_per_epoch + 1
                ), "last epoch number of samples exceeded max value."
                # If we have less than 80% of the samples for the last epoch,
                # seperate out the epoch and treat it differently.
                # Note: the 80% number is just based on common sense and can
                # be adjusted if needed.
                separate_last_epoch = last_epoch_num_samples < int(
                    0.80 * num_samples_per_epoch
                )
                if separate_last_epoch:
                    string = (
                        " > last epoch number of samples ({}) is smaller "
                        "than 80% of number of samples per epoch ({}), "
                        "setting separate_last_epoch to True"
                    )
                else:
                    string = (
                        " > last epoch number of samples ({}) is larger "
                        "than 80% of number of samples per epoch ({}), "
                        "setting separate_last_epoch to False"
                    )
                print(
                    string.format(last_epoch_num_samples, num_samples_per_epoch),
                    flush=True,
                )

            # doc-idx.
            start_time = time.time()
            doc_idx = _build_doc_idx(documents, num_epochs, np_rng, separate_last_epoch)
            np.save(doc_idx_filename, doc_idx, allow_pickle=True)
            print_rank_0(
                f">Elasped time to build and save doc-idx mapping (seconds): \
                {time.time() - start_time:4f}"
            )
            # sample-idx.
            start_time = time.time()
            # Use C++ implementation for speed.
            # First compile and then import.
            from megatron.data import helpers

            assert doc_idx.dtype == np.int32
            assert sizes.dtype == np.int32
            sample_idx = helpers.build_sample_idx(
                sizes, doc_idx, seq_length, num_epochs, tokens_per_epoch
            )
            # sample_idx = _build_sample_idx(sizes, doc_idx, seq_length,
            #                               num_epochs, tokens_per_epoch)
            np.save(sample_idx_filename, sample_idx, allow_pickle=True)
            print_rank_0(
                f">Elasped time to build and save sample-idx mapping (seconds): \
                {time.time() - start_time:4f}"
            )
            # shuffle-idx.
            start_time = time.time()
            # -1 is due to data structure used to retieve the index:
            #    sample i --> [sample_idx[i], sample_idx[i+1])
            if separate_last_epoch:
                num_samples_ = num_samples_from_epochs_minus_one
            else:
                num_samples_ = sample_idx.shape[0] - 1
            shuffle_idx = _build_shuffle_idx(
                num_samples_, sample_idx.shape[0] - 1, np_rng
            )
            np.save(shuffle_idx_filename, shuffle_idx, allow_pickle=True)
            print_rank_0(
                f">Elasped time to build and save shuffle-idx mapping (seconds): \
                {time.time() - start_time:4f}"
            )

    # This should be a barrier but nccl barrier assumes
    # device_index=rank which is not the case for model
    # parallel case
    counts = get_accelerator().LongTensor([1])
    torch.distributed.all_reduce(counts, group=mpu.get_data_parallel_group())
    torch.distributed.all_reduce(counts, group=mpu.get_pipeline_model_parallel_group())
    assert counts[0].item() == (
        torch.distributed.get_world_size()
        // torch.distributed.get_world_size(group=mpu.get_tensor_model_parallel_group())
    )

    # Load mappings.
    start_time = time.time()
    print_rank_0(f">Loading doc-idx mapping from {doc_idx_filename}...")
    doc_idx = np.load(doc_idx_filename, allow_pickle=True, mmap_mode="r")
    print_rank_0(f">Loading sample-idx mapping from {sample_idx_filename}...")
    sample_idx = np.load(sample_idx_filename, allow_pickle=True, mmap_mode="r")
    print_rank_0(f">Loading shuffle-idx mapping from {shuffle_idx_filename}")
    shuffle_idx = np.load(shuffle_idx_filename, allow_pickle=True, mmap_mode="r")
    print_rank_0(f">>>Loaded indexed file in {time.time() - start_time:3.3f} seconds.")
    print_rank_0(f">>>Total number of samples: {sample_idx.shape[0]}")
    print_rank_0(f">>>Total number of epochs: {num_epochs}")

    return doc_idx, sample_idx, shuffle_idx


def _num_tokens(documents, sizes):
    """Total number of tokens in the dataset."""
    return np.sum(sizes[documents])


def _num_epochs(tokens_per_epoch, seq_length, num_samples):
    """Based on number of samples and sequence lenght, calculate how many
    epochs will be needed."""
    num_epochs = 0
    total_tokens = 0
    while True:
        num_epochs += 1
        total_tokens += tokens_per_epoch
        # -1 is because we need to retrieve seq_length + 1 token each time
        # but the last token will overlap with the first token of the next
        # sample except for the last sample.
        if ((total_tokens - 1) // seq_length) >= num_samples:
            return num_epochs


def _build_doc_idx(documents, num_epochs, np_rng, separate_last_epoch):
    """Build an array with length = number-of-epochs * number-of-dcuments.
    Each index is mapped to a corresponding document."""
    if not separate_last_epoch or num_epochs == 1:
        doc_idx = np.mgrid[0:num_epochs, 0 : len(documents)][1]
        doc_idx[:] = documents
        doc_idx = doc_idx.reshape(-1)
        doc_idx = doc_idx.astype(np.int32)
        np_rng.shuffle(doc_idx)
        return doc_idx

    doc_idx_first = _build_doc_idx(documents, num_epochs - 1, np_rng, False)
    doc_idx_last = _build_doc_idx(documents, 1, np_rng, False)
    return np.concatenate((doc_idx_first, doc_idx_last))


def _build_sample_idx(sizes, doc_idx, seq_length, num_epochs, tokens_per_epoch):
    """Sample index mapping is a 2D array with sizes
    [number-of-samples + 1, 2] where [..., 0] contains
    the index into `doc_idx` and [..., 1] is the
    starting offset in that document."""

    # Total number of samples. For -1 see comments in `_num_epochs`.
    num_samples = (num_epochs * tokens_per_epoch - 1) // seq_length
    sample_idx = np.zeros([num_samples + 1, 2], dtype=np.int32)

    # Index into sample_idx.
    sample_index = 0
    # Index into doc_idx.
    doc_idx_index = 0
    # Begining offset for each document.
    doc_offset = 0
    # Start with first document and no offset.
    sample_idx[sample_index][0] = doc_idx_index
    sample_idx[sample_index][1] = doc_offset
    sample_index += 1
    while sample_index <= num_samples:
        # Start with a fresh sequence.
        remaining_seq_length = seq_length + 1
        while remaining_seq_length != 0:
            # Get the document length.
            doc_id = doc_idx[doc_idx_index]
            doc_length = sizes[doc_id] - doc_offset
            # And add it to the current sequence.
            remaining_seq_length -= doc_length
            # If we have more than a full sequence, adjust offset and set
            # remaining length to zero so we return from the while loop.
            # Note that -1 here is for the same reason we have -1 in
            # `_num_epochs` calculations.
            if remaining_seq_length <= 0:
                doc_offset += remaining_seq_length + doc_length - 1
                remaining_seq_length = 0
            else:
                # Otherwise, start from the begining of the next document.
                doc_idx_index += 1
                doc_offset = 0
        # Record the sequence.
        sample_idx[sample_index][0] = doc_idx_index
        sample_idx[sample_index][1] = doc_offset
        sample_index += 1

    return sample_idx


def _build_shuffle_idx(num_samples, total_size, np_rng):
    """Build the range [0, size) and shuffle."""
    print(
        f">Building shuffle index with split [0, {num_samples}) and [{num_samples}, {total_size})...",
        flush=True,
    )

    dtype_ = np.uint32
    if total_size >= (np.iinfo(np.uint32).max - 1):
        dtype_ = np.int64

    shuffle_idx_first = np.arange(start=0, stop=num_samples, step=1, dtype=dtype_)
    np_rng.shuffle(shuffle_idx_first)
    if num_samples == total_size:
        return shuffle_idx_first

    shuffle_idx_last = np.arange(
        start=num_samples, stop=total_size, step=1, dtype=dtype_
    )
    np_rng.shuffle(shuffle_idx_last)

    return np.concatenate((shuffle_idx_first, shuffle_idx_last))
