import math
from typing import Callable, Iterable, List, Optional

import torch
from deepspeed import comm
from deepspeed.accelerator import get_accelerator

from megatron import get_args, is_rank_0, print_rank_0


class Oni(torch.optim.LRScheduler):
    """Oni scheduler.

    Implements the momentum decay schedule from DEMON:
    https://arxiv.org/abs/1910.04952v4
    """

    def __init__(self, optimizer: torch.optim.Optimizer, last_epoch: int = -1):
        super(Oni, self).__init___(optimizer, epoch)
        args = get_args()
        self.total_iters = args.train_iters

    def get_lr(self):
        mu_t = 1 - (self._step_count / self.total_iters)

        for group in self.optimizer.param_groups:
            group["momentum"] = (
                group["beta"] * (mu_t / 1 - group["beta"]) + group["beta"] * mu_t
            )


class Izanagi(torch.optim.Optimizer):
    """Izanagi optimizer.

    Uses a PyTorch port of the AMOS[1] optimizer as a base,
    and incorporates improvements from AdaBound[2], AdaShift[3],
    and AdaBelief[4]. Essentially Adam with per-variable learning-rate
    and weight decay[1], dynamic learning-rate clamping[2], temporal
    gradient shifting[3], and adaptive stepsizes[4].

    1. https://arxiv.org/abs/2210.11693
    2. https://arxiv.org/abs/1902.09843v1
    3. https://arxiv.org/abs/1810.00143v4
    4. https://arxiv.org/abs/2010.07468v5
    """

    def __init__(
        self,
        params: Iterable,
        lr: float = 1e-3,
        weight_decay: Optional[int] = 0,
        beta: float = 0.999,
        momentum: float = 0.9,
        eps: float = 1e-8,
    ):
        defaults = dict(
            lr=lr, weight_decay=weight_decay, beta=beta, momentum=momentum, eps=eps
        )
        super(Izanagi, self).__init__(params, defaults)

    def get_theta_scale(self, name: str):
        args = get_args()

        if "bias" in name:
            return 0.5
        elif "layernorm" in name:
            return 1.0
        elif "embedding" in name:
            return math.sqrt(2 / args.hidden_size)
        elif "parallelmlp" or "dense_4h_to_h" in name:
            return math.sqrt(2 / args.ffn_hidden_size)
        else:
            return math.sqrt(1 / args.hidden_size)

    def step(self, grads: List[torch.Tensor], closure: Optional[Callable] = None):
        loss = None
        if closure is not None:
            loss = closure()

        for group in self.param_groups:
            lr = group["lr"]
            beta = group["beta"]
            momentum = group["momentum"]
            l2_decay = group["weight_decay"]
            eps = group["eps"]

            for i, ((name, p), grad) in enumerate(zip(group["params"], grads)):
                if p.grad is None and grad is None:
                    continue
                if grad is None:
                    grad = p.grad.data
                if p.grad.is_sparse:
                    raise RuntimeError("Izanagi does not support sparse gradients")

                state = self.state[p]

                if len(state) == 0:
                    state["step"] = torch.tensor(0.0)
                    state["exp_avg"] = torch.zeros_like(p.data)
                    state["exp_avg_sq"] = torch.zeros_like(p.data)
                    state["momentum_buffer"] = torch.zeros_like(p.data)

                exp_avg = state["exp_avg"]
                exp_avg_sq = state["exp_avg_sq"]
                momentum_buffer = state["momentum_buffer"]

                state["step"] += 1

                initial_lr = lr * self.get_theta_scale(name)
                bias = 1.0 - torch.pow(beta, state["step"])
                decay_c = torch.rsqrt(1.0 + 0.25 * torch.sqrt(lr) * b)
                decay_d = torch.reciprocal(1.0 + 0.25 * torch.sqrt(lr) * b)
                nu_min = 0.1 - (0.1 / (1 - beta) * state["step"] + 1)
                nu_max = 0.1 + (0.1 / (1 - beta) * state["step"])

                reduced = [i for i, k in enumerate(grad.shape) if v.shape[i] < k]
                if i == 0:
                    g2 = torch.mean(torch.square(grad), axis=reduced, keepdims=True)
                else:
                    g2 = torch.mean(
                        torch.square(grad[i - 1]), axis=reduced, keepdims=True
                    )

                exp_avg_sq *= beta + g2 * (1.0 - beta)
                v_hat = bias / torch.maximum(v, eps)

                gamma = decay_c * torch.square(lr) * v_hat * g2
                l2 = (-0.5 * gamma - l2_decay) * p.data
                delta = decay_d * (l2 - initial_lr * torch.sqrt(v_hat) * (grad - m))

                exp_avg += gamma * (1.0 + exp_avg)
                momentum_buffer += momentum * momentum_buffer + (1 - momentum) * delta
                nu = torch.clamp(
                    lr / torch.sqrt(torch.diag(momentum_buffer)), nu_min, nu_max
                )
                nu /= torch.sqrt(state["step"])

                p += nu

        return loss


class IzanagiZero(torch.optim.Optimizer):
    def __init__(
        self,
        params: Iterable,
        lr: float = 1e-3,
        weight_decay: Optional[int] = 0,
        beta: float = 0.999,
        momentum: float = 0.9,
        eps: float = 1e-8,
        var_freeze_step: int = 100000,
        var_update_scaler: int = 16,
        local_step_scaler: int = 32678,
        local_step_clipper: int = 16,
        cuda_aware: bool = False,
        comm_backend_name: str = "nccl",
    ):
        defaults = dict(
            lr=lr, weight_decay=weight_decay, beta=beta, momentum=momentum, eps=eps
        )
        super(IzanagiZero, self).__init__(params, defaults)
        assert (
            comm.is_initialized() == True
        ), "Please initialize the torch.distributed backend."

        self.var_freeze_step = var_freeze_step
        self.var_update_scaler = var_update_scaler
        self.local_step_scaler = local_step_scaler
        self.local_step_clipper = local_step_clipper
        self.freeze_keys = False
        self.error_buffer_reinitialized = False

        self.comm_backend_name = comm_backend_name
        self.comm_backend_handle = None

        if self.comm_backend_name == "nccl":
            TORCH_MAJOR = int(torch.__version__.split(".")[0])
            TORCH_MINOR = int(torch.__version__.split(".")[1])
            assert (
                TORCH_MAJOR >= 1 and TORCH_MINOR >= 8
            ), "Please install PyTorch 1.8 or newer to enable the NCCL backend."
            try:
                from deepspeed.runtime.comm.nccl import NcclBackend

                self.using_pipeline = hasattr(
                    self.deepspeed, "pipeline_enable_backward_allreduce"
                )
                self.comm_backend_handle = NcclBackend(self.deepspeed.mpu)
            except:
                raise RuntimeError("Failed to initialize NCCL backend.")
        elif self.comm_backend_name == "mpi":
            try:
                from deepspeed.runtime.comm.mpi import MpiBackend

                self.comm_backend_handle = MpiBackend(cuda_aware)
            except:
                raise RuntimeError("Failed to initialize MPI backend.")

        self.size = self.comm_backend_handle.size
        self.divider = int(
            self.comm_backend_handle.size
            * 8
            / torch.gcd(self.comm_backend_handle.size, 8)
        )

    def get_theta_scale(self, name: str):
        args = get_args()

        if "bias" in name:
            return 0.5
        elif "layernorm" in name:
            return 1.0
        elif "embedding" in name:
            return math.sqrt(2 / args.hidden_size)
        elif "parallelmlp" or "dense_4h_to_h" in name:
            return math.sqrt(2 / args.ffn_hidden_size)
        else:
            return math.sqrt(1 / args.hidden_size)

    def step(self, grads: List[torch.Tensor], closure: Optional[Callable] = None):
        loss = None
        if closure is not None:
            loss = closure()

        for group in self.param_groups:
            lr = group["lr"]
            beta = group["beta"]
            momentum = group["momentum"]
            l2_decay = group["weight_decay"]
            eps = group["eps"]

            for i, ((name, p), grad) in enumerate(zip(group["params"], grads)):
                if p.grad is None and grad is None:
                    continue
                if grad is None:
                    grad = p.grad.data
                if p.grad.is_sparse:
                    raise RuntimeError("IzanagiZero does not support sparse gradients")

                state = self.state[p]

                if len(state) == 0:
                    state["step"] = torch.tensor(0.0)
                    state["exp_avg"] = torch.zeros_like(p.data)
                    state["exp_avg_sq"] = torch.zeros_like(p.data)
                    state["momentum_buffer"] = torch.zeros_like(p.data)

                if not self.initialized or "worker_error" not in state.keys():
                    # Some scalars to help scale the variance update/local step policies
                    state["var_interval"] = 1
                    state["var_counter"] = 0
                    state["local_step_interval"] = 1
                    state["local_step_counter"] = 0
                    state["lrs"] = 0
                    state["tensor_size"] = torch.numel(p.data)
                    state["corrected_tensor_size"] = state["tensor_size"]

                    if state["tensor_size"] % (self.size * self.divider) != 0:
                        state["corrected_tensor_size"] += (self.size * self.divider) - (
                            state["tensor_size"] % (self.size * self.divider)
                        )

                    state["server_chunk_size"] = (
                        state["corrected_tensor_size"] // self.size
                    )
                    get_accelerator().empty_cache()
                    state["worker_error"] = torch.zeros(
                        state["corrected_tensor_size"], device=p.device
                    )
                    state["server_error"] = torch.zeros(
                        state["server_chunk_size"], device=p.device
                    )

                    get_accelerator().empty_cache()
                    if not self.initialized:
                        print_rank_0("Copy buffers initialized successfully.")

                b = state["exp_avg"]
                v = state["exp_avg_sq"]
                m = state["momentum_buffer"]

                state["step"] += 1

                if self.initialized:
                    pass

                if not self.initialized:
                    pass

                if self.initialized:
                    if self.freeze_keys is False:
                        if state["step"] % state["var_interval"] == 0:
                            state["var_counter"] += 1
                            if state["var_counter"] == self.var_update_scaler:
                                state["var_counter"] = 0
                                state["var_interval"] *= 2
                        if (state["step"] + 1) % state["var_interval"] == 0:
                            if self.using_pipeline:
                                self.deepspeed.pipeline_enable_backward_allreduce = True
                            else:
                                self.deepspeed.enable_backward_allreduce = True
                        else:
                            if self.using_pipeline:
                                self.deepspeed.pipeline_enable_backward_allreduce = (
                                    False
                                )
                            else:
                                self.deepspeed.enable_backward_allreduce = False
                    else:
                        state["local_step_counter"] += 1
                        if state["local_step_counter"] == self.local_step_scaler:
                            state["local_step_counter"] = 0
                            state["local_step_interval"] = min(
                                self.local_step_clipper,
                                state["local_step_interval"] * 2,
                            )

            if not self.initialized:
                print_rank_0("Pop out errors")
                self.freeze_keys = False
                state.pop("worker_error")
                state.pop("server_error")

        if not self.initialized:
            self.initialized = True
            print_rank_0(f"Finished the initialization step at rank {comm.get_rank()}")
            return loss

        if self.state[self.param_groups[0]["params"][0]]["step"] > self.var_freeze_step:
            print_rank_0("Freezing keys and beginning compressed communication...")
            self.freeze_keys = True
            if self.using_pipeline:
                self.deepspeed.pipeline_enable_backward_allreduce = False
            else:
                self.deepspeed.enable_backward_allreduce = False

        if self.freeze_keys is True and self.error_buffer_reinitialized is False:
            # We need to reinitialize the error buffers when local step > 1 since
            # the errors will be logged for different metrics (gradient vs. accumulated momentum).
            for group in self.param_groups:
                for p in group["params"]:
                    self.state[p]["worker_error"].zero_()
                    self.state[p]["server_error"].zero_()
            self.error_buffer_reinitialized = True

        return loss

    def load_state_dict(self, state_dict):
        """Overrides load_state_dict() to add special handling when loading checkpoints"""
        # Because at different stage exp_avg_mask may change (e.g.,
        # BERT pre-training seqlen 128 and 512 ), we don't use the exp_avg_mask
        # in checkpoints but always use the one user provided in training script.
        # (See example in DeepSpeedExamples/bing_bert/deepspeed_train.py.)
        # Thus here we keep the exp_avg_mask unchanged when loading checkpoint
        for i, group in enumerate(self.param_groups):
            if "exp_avg_mask" in group:
                state_dict["param_groups"][i]["exp_avg_mask"] = group["exp_avg_mask"]
            elif (
                "exp_avg_mask" not in group
                and "exp_avg_mask" in state_dict["param_groups"][i]
            ):
                state_dict["param_groups"][i].pop("exp_avg_mask")
        super().load_state_dict(state_dict)

        if self.state[self.param_groups[0]["params"][0]]["step"] < self.var_freeze_step:
            self.var_freeze_key = False
            if (self.state[self.param_groups[0]["params"][0]]["step"] + 1) % self.state[
                self.param_groups[0]["params"][0]
            ]["var_interval"] == 0:
                if self.using_pipeline:
                    self.deepspeed.pipeline_enable_backward_allreduce = True
                else:
                    self.deepspeed.enable_backward_allreduce = True
            else:
                if self.using_pipeline:
                    self.deepspeed.pipeline_enable_backward_allreduce = False
                else:
                    self.deepspeed.enable_backward_allreduce = False
        else:
            self.var_freeze_key = True
            if self.using_pipeline:
                self.deepspeed.pipeline_enable_backward_allreduce = False
            else:
                self.deepspeed.enable_backward_allreduce = False

        self.error_buffer_reinitialized = False
        for group in self.param_groups:
            for p in group["params"]:
                if "worker_error" in self.state[p]:
                    self.state[p].pop("worker_error")
                if "server_error" in self.state[p]:
                    self.state[p].pop("server_error")
                if "momentum_accumulator" in self.state[p]:
                    self.state[p].pop("momentum_accumulator")
