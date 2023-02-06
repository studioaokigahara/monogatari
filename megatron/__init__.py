# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.
import os

import torch

from .global_vars import (
    get_adlr_autoresume,
    get_args,
    get_current_global_batch_size,
    get_num_microbatches,
    get_signal_handler,
    get_timers,
    get_tokenizer,
    update_num_microbatches,
)
from .initialize import initialize_megatron
from .utils import is_last_rank, is_rank_0, print_rank_0, print_rank_last
