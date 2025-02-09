# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.


import torch
from deepspeed.accelerator import get_accelerator

# A dictionary of all the memory buffers allocated.
_MEM_BUFFS = dict()


def allocate_mem_buff(name, numel, dtype, track_usage):
    """Allocate a memory buffer."""
    assert name not in _MEM_BUFFS, f"memory buffer {name} already allocated."
    _MEM_BUFFS[name] = MemoryBuffer(name, numel, dtype, track_usage)
    return _MEM_BUFFS[name]


def get_mem_buff(name):
    """Get the memory buffer."""
    return _MEM_BUFFS[name]


class MemoryBuffer:
    """Contiguous memory buffer.
    Allocate a contiguous memory of type `dtype` and size `numel`. It is
    used to reduce memory fragmentation.

    Usage: After the allocation, the `_start` index is set tot the first
           index of the memory. A memory chunk starting from `_start` index
           can be `allocated` for an input tensor, with the elements of the
           tensor being coppied. The buffer can be reused by resetting the
           `_start` index.

    """

    def __init__(self, name, numel, dtype, track_usage):
        element_size = torch.tensor([], dtype=dtype).element_size()
        print_rank_0(
            f">Building the {name} memory buffer with {numel} num elements \
                and {dtype} dtype ({numel*element_size/1024/1024:.1f} MB)..."
        )
        self.name = name
        self.numel = numel
        self.dtype = dtype
        self.data = torch.empty(
            self.numel,
            dtype=self.dtype,
            device=get_accelerator().current_device(),
            requires_grad=False,
        )

        # Index tracking the start of the free memory.
        self._start = 0

        # Values used for tracking usage.
        self.track_usage = track_usage
        if self.track_usage:
            self.in_use_value = 0.0
            self.total_value = 0.0

    def reset(self):
        """Reset the buffer start index to the beginning of the buffer."""
        self._start = 0

    def is_in_use(self):
        """Whether the current buffer hold on to any memory."""
        return self._start > 0

    def numel_in_use(self):
        """Return number of elements in use."""
        return self._start

    def add(self, tensor):
        """Allocate a chunk of memory from the buffer to tensor and copy
        the values."""
        assert (
            tensor.dtype == self.dtype
        ), f"Input tensor type {tensor.dtype} different from buffer type {self.dtype}"
        # Number of elements of the input tensor.
        tensor_numel = torch.numel(tensor)
        new_start = self._start + tensor_numel
        assert (
            new_start <= self.numel
        ), f"Not enough memory left in the buffer ({tensor_numel} > {self.numel - self._start})"
        # New tensor is a view into the memory.
        new_tensor = self.data[self._start : new_start]
        self._start = new_start
        new_tensor = new_tensor.view(tensor.shape)
        new_tensor.copy_(tensor)
        # Return a pointer to the new tensor.
        return new_tensor

    def get_data(self):
        """Return the data currently in use."""
        if self.track_usage:
            self.in_use_value += float(self._start)
            self.total_value += float(self.numel)
        return self.data[: self._start]

    def print_average_usage(self):
        """Print memory usage average over time. We would like this value
        to be as high as possible."""
        assert self.track_usage, "You need to enable track usage."
        print_rank_0(
            f">Usage of {self.name} memory buffer: {self.in_use_value * 100.0 / self.total_value:.2f} %"
        )


class RingMemBuffer:
    """A ring of memory buffers."""

    def __init__(self, name, num_buffers, numel, dtype, track_usage):
        self.num_buffers = num_buffers
        self.buffers = [
            allocate_mem_buff(name + f" {i}", numel, dtype, track_usage)
            for i in range(num_buffers)
        ]
        self._index = -1

    def get_next_buffer(self):
        self._index += 1
        self._index = self._index % self.num_buffers
        buff = self.buffers[self._index]
        assert not buff.is_in_use(), "Buffer is already in use."
        return buff
