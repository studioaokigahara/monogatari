# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

try:
    from apex.normalization.fused_layer_norm import MixedFusedRMSNorm as LayerNorm
except ImportError:
    from .fused_layer_norm import MixedFusedLayerNorm as LayerNorm

from .bert_model import BertModel
from .distributed import DistributedDataParallel
from .enums import ModelType
from .gpt_model import GPTModel
from .language_model import get_language_model
from .module import Float16Module
from .monogatari_model import MonogatariModel
from .t5_model import T5Model
