import os

import torch
from deepspeed.accelerator import get_accelerator

from megatron.core import mpu


class Utils:

    world_size = get_accelerator().device_count()
    rank = int(os.environ["LOCAL_RANK"])

    @staticmethod
    def initialize_distributed():
        print(
            f"Initializing torch.distributed with rank: {Utils.rank}, world_size: {Utils.world_size}"
        )
        get_accelerator().set_device(Utils.rank % get_accelerator().device_count())
        init_method = "tcp://"
        master_ip = os.getenv("MASTER_ADDR", "localhost")
        master_port = os.getenv("MASTER_PORT", "6000")
        init_method += master_ip + ":" + master_port
        torch.distributed.init_process_group(
            backend="nccl",
            world_size=Utils.world_size,
            rank=Utils.rank,
            init_method=init_method,
        )

    @staticmethod
    def destroy_model_parallel():
        mpu.destroy_model_parallel()
        torch.distributed.barrier()

    @staticmethod
    def initialize_model_parallel(
        tensor_model_parallel_size=1,
        pipeline_model_parallel_size=1,
        virtual_pipeline_model_parallel_size=None,
        pipeline_model_parallel_split_rank=None,
    ):
        mpu.destroy_model_parallel()
        if not torch.distributed.is_initialized():
            Utils.initialize_distributed()
        mpu.initialize_model_parallel(
            tensor_model_parallel_size,
            pipeline_model_parallel_size,
            virtual_pipeline_model_parallel_size,
            pipeline_model_parallel_split_rank,
        )
