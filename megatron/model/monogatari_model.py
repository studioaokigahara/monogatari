# Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

"""Monogatari model."""

import torch
import torch.nn.functional as F
from ct.ct_loss import ContrastiveTokenLoss
from einops import einsum, pack, rearrange, reduce, repeat, unpack

from megatron import get_args, get_tokenizer
from megatron.core import mpu

from .enums import AttnMaskType, AttnType
from .language_model import Embedding, parallel_lm_logits
from .module import MegatronModule
from .transformer import ParallelTransformer
from .utils import (
    get_linear_layer,
    init_method_normal,
    sampler,
    scaled_init_method_normal,
)


def get_language_model(
    num_tokentypes,
    init_method=None,
    scaled_init_method=None,
    pre_process=True,
    post_process=True,
):
    """Build language model and return along with the key to save."""
    args = get_args()

    if init_method is None:
        init_method = init_method_normal(args.init_method_std)

    if scaled_init_method is None:
        scaled_init_method = scaled_init_method_normal(
            args.init_method_std, args.num_layers
        )

    language_model = MonogatariLanguageModel(
        init_method,
        scaled_init_method,
        num_tokentypes=num_tokentypes,
        pre_process=pre_process,
        post_process=post_process,
    )
    language_model_key = "language_model"

    auxiliary_model = MonogatariAuxiliaryModel(
        init_method,
        scaled_init_method,
        num_tokentypes=num_tokentypes,
        pre_process=pre_process,
        post_process=post_process,
    )
    auxiliary_model_key = "auxiliary_model"

    return language_model, language_model_key, auxiliary_model, auxiliary_model_key


def post_auxiliary_model_processing(
    lm_output,
    pooled_output,
    lm_head,
    binary_head,
    lm_labels,
    logit_weights,
    fp16_lm_cross_entropy,
):
    args = get_args()

    # Output.
    lm_logits = lm_head(lm_output, logit_weights)

    binary_logits = None
    if binary_head is not None:
        binary_logits = binary_head(pooled_output)

    if lm_labels is None:
        return rearrange(lm_logits, "s b h -> b s h"), binary_logits
    else:
        lm_labels = rearrange(lm_labels, "b s -> s b")

        if fp16_lm_cross_entropy:
            assert lm_logits.dtype == torch.half
            lm_loss = mpu.vocab_parallel_cross_entropy(lm_logits, lm_labels)
        else:
            lm_loss = mpu.vocab_parallel_cross_entropy(lm_logits.float(), lm_labels)

        lm_loss = rearrange(lm_loss, "s b -> b s")

        pos_row_idx, pos_col_idx = sampler(lm_labels, window_size=args.taco_window_size)
        neg_row_idx, neg_col_idx = sampler(
            lm_labels, num_samples=args.taco_num_samples, positive=False
        )

        anchor = lm_output - logit_weights
        positives = (
            lm_output[pos_row_idx, pos_col_idx, :]
            - logit_weights[pos_row_idx, pos_col_idx, :]
        )
        negatives = (
            lm_output[neg_row_idx, neg_col_idx, :]
            - logit_weights[neg_row_idx, neg_col_idx, :]
        )

        anchor = F.normalize(anchor, p=2, dim=-1)
        positives = F.normalize(positives, p=2, dim=-1).detach()
        negatives = F.normalize(negatives, p=2, dim=-1).detach()

        positive_logits = einsum(anchor, positives, "s b h, s b h -> s b 1")
        negative_logits = einsum(anchor, negatives, "s b h, s b n h -> s b n")
        taco_logits, _ = pack([positive_logits, negative_logits], "s b *")

        taco_logits /= args.taco_temperature

        taco_labels = torch.zeros(
            taco_logits.shape[0], taco_logits.shape[1], dtype=torch.long
        )
        taco_loss = mpu.vocab_parallel_cross_entropy(taco_logits, taco_labels)
        taco_loss = rearrange(taco_loss, "s b -> b s")
        lm_loss += taco_loss * args.taco_loss_weight

        return lm_loss, binary_logits


def post_language_model_processing(
    lm_output, labels, logit_weights, lm_head, parallel_output, fp16_lm_cross_entropy
):
    tokenizer = get_tokenizer()

    logits = parallel_lm_logits(lm_output, logit_weights, parallel_output)

    if labels is None:
        return rearrange(logits, "s b h -> b s h")
    else:
        labels = rearrange(labels, "b s -> s b")

        if fp16_lm_cross_entropy:
            assert output.dtype == torch.half
            loss = mpu.vocab_parallel_cross_entropy(logits, labels)
        else:
            loss = mpu.vocab_parallel_cross_entropy(logits.float(), labels)

        loss = rearrange(loss, "s b -> b s")

        ct = ContrastiveTokenLoss(pad_id=tokenizer.pad)
        ct_loss = ct(output, labels)
        loss += ct_loss * args.ct_loss_weight

        return loss


class GradReversal(Function):
    """Gradient backpropagation reversal."""

    @staticmethod
    def forward(ctx, x, lambd=-1):
        ctx.lambd = lambd
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        return (grad_output * ctx.lambd), None


class MaskedLMHead(MegatronModule):
    """Masked LM head.

    Arguments:
        mpu_vocab_size: model parallel size of vocabulary
        hidden_size: hidden size
        init_method: init method for weight initialization
        layernorm_epsilon: tolerance for layer norm divisions
        parallel_output: whether output logits being distributed or not
    """

    def __init__(
        self,
        mpu_vocab_size,
        hidden_size,
        init_method,
        layernorm_epsilon,
        parallel_output,
    ):
        super(MaskedLMHead, self).__init__()
        args = get_args()

        self.bias = torch.nn.Parameter(torch.zeros(mpu_vocab_size))
        mpu.set_tensor_model_parallel_attributes(self.bias, True, 0, 1)
        self.parallel_output = parallel_output

        self.dense = get_linear_layer(hidden_size, hidden_size, init_method)
        setattr(self.dense.weight, "sequence_parallel", args.sequence_parallel)
        setattr(self.dense.bias, "sequence_parallel", args.sequence_parallel)

        self.layernorm = LayerNorm(
            hidden_size, eps=layernorm_epsilon, sequence_parallel=args.sequence_parallel
        )
        self.gelu = F.gelu
        if args.openai_gelu:
            self.gelu = openai_gelu
        elif args.onnx_safe:
            self.gelu = erf_gelu

    def forward(self, hidden_states, word_embeddings_weight):
        hidden_states = self.dense(hidden_states)
        hidden_states = self.gelu(hidden_states)
        hidden_states = self.layernorm(hidden_states)
        output = parallel_lm_logits(
            hidden_states, word_embeddings_weight, self.parallel_output, self.bias
        )

        return output


class MixtapeHead(MegatronModule):
    """
    Mixtape (an efficient Mixture-of-Softmaxes algorithm) output head.
    https://papers.nips.cc/paper/2019/hash/512fc3c5227f637e41437c999a2d3169-Abstract.html

    Takes last-layer hidden states of size [s, b, h],
    and returns high-rank output representations.
    20-30% slower than a normal softmax output, but gives
    signficantly better perplexity.

    Arguments:
        mpu_vocab_size: model parallel size of vocabulary
        hidden_size: hidden size
        init_method: init method for weight initialization
        parallel_output: whether output logits being distributed or not
    """

    def __init__(self, mpu_vocab_size, init_method, parallel_output):
        super(MixtapeHead, self).__init()
        args = get_args()

        self.bias = torch.nn.Parameter(torch.zeros(mpu_vocab_size))
        mpu.set_tensor_model_parallel_attributes(self.bias, True, 0, 1)
        self.parallel_output = parallel_output

        self.dropout = args.mixtape_dropout

        self.delta = torch.nn.Parameter(mpu_vocab_size, args.hidden_size)
        self.gamma = torch.nn.Parameter(args.mixtape_gate_size)
        self.tau = torch.nn.Parameter(args.mixtape_gate_size, args.hidden_size)
        self.mu = torch.nn.Parameter(args.hidden_size)
        self.beta = torch.nn.Parameter()

    def forward(self, hidden_states, word_embeddings_weight):
        context_embed = einsum("v h, s b h -> s b h", self.delta, hidden_states)
        context_embed = F.dropout(torch.tanh(context_embed), p=self.dropout)
        shared_prior = einsum("h, s b h -> s b h", self.mu, hidden_states)
        gate_prior = einsum("g h, s b h -> s b h", self.tau, hidden_states)
        gate_prior = F.dropout(torch.tanh(gate_prior), p=self.dropout)
        gate_prior = einsum("g, s b h -> s b h", self.gamma, gate_prior)
        gate_prior += shared_prior + rearrange(self.beta, "... -> ... 1 1")

        sigmoid_prob = torch.sigmoid(gate_prior)

        sigmoid_tree[0] = sigmoid_prob[0] * sigmoid_prob[1]
        sigmoid_tree[1] = sigmoid_prob[0] * (1 - sigmoid_prob[1])
        sigmoid_tree[2] = (1 - sigmoid_prob[0]) * sigmoid_prob[2]
        sigmoid_tree[3] = (1 - sigmoid_prob[0]) * (1 - sigmoid_prob[2])

        output = parallel_lm_logits(
            context_embed + shared_prior,
            word_embeddings_weight,
            self.parallel_output,
            self.bias,
        )
        output = F.softmax(output * sigmoid_tree, dim=-1)

        return output


class MonogatariAuxiliaryModel(MegatronModule):
    """Auxiliary language model.

    Arguments:
        transformer_hparams: transformer hyperparameters
        vocab_size: vocabulary size
        max_sequence_length: maximum size of sequence. This
                        is used for positional embedding
        embedding_dropout_prob: dropout probability for embeddings
        num_tokentypes: size of the token-type embeddings. 0 value
                        will ignore this embedding
    """

    def __init__(
        self,
        init_method,
        output_layer_init_method,
        num_tokentypes=0,
        pre_process=True,
        post_process=True,
        add_binary_head=True,
    ):
        super(MonogatariAuxiliaryModel, self).__init__()
        args = get_args()

        self.hidden_size = args.hidden_size

        self.embedding = Embedding(
            self.hidden_size,
            args.padded_vocab_size,
            args.max_position_embeddings,
            args.hidden_dropout,
            init_method,
            num_tokentypes,
        )

        self.encoder = ParallelTransformer(
            init_method,
            output_layer_init_method,
            layer_type=LayerType.encoder,
            attn_type=AttnType.mega,
            attn_mask_type=AttnMaskType.padding,
            pre_process=pre_process,
            post_process=post_process,
        )
        self._encoder_key = "encoder"

        self.lm_head = MaskedLMHead(
            args.mpu_vocab_size,
            self.hidden_size,
            init_method,
            args.layernorm_epsilon,
            args.parallel_output,
        )
        self._lm_head_key = "lm_head"

        self.binary_head = None
        if add_binary_head:
            self.binary_head = get_linear_layer(args.hidden_size, 2, init_method)
            self._binary_head_key = "binary_head"

    def forward(
        self,
        input_ids,
        position_ids,
        attention_mask,
        labels=None,
        inference_params=None,
    ):

        output = self.encoder(input_ids, attention_mask, inference_params)

        if self.post_process and self.add_binary_head:
            output, pooled_output = output
        else:
            pooled_output = None

        return output, pooled_output

    def state_dict_for_save_checkpoint(self, prefix="", keep_vars=False):
        """For easy load."""

        state_dict_ = {}
        state_dict_[self._encoder_key] = self.encoder.state_dict_for_save_checkpoint(
            prefix=prefix, keep_vars=keep_vars
        )
        if self.post_process:
            state_dict_[
                self._lm_head_key
            ] = self.lm_head.state_dict_for_save_checkpoint(
                prefix=prefix, keep_vars=keep_vars
            )
        if self.post_process and self.add_binary_head:
            state_dict_[self._binary_head_key] = self.binary_head.state_dict(
                prefix=prefix, keep_vars=keep_vars
            )
        if self.post_process and not self.pre_process:
            state_dict_[
                self._word_embeddings_for_head_key
            ] = self.word_embeddings.state_dict(prefix=prefix, keep_vars=keep_vars)

        return state_dict_

    def load_state_dict(self, state_dict, strict=True):
        """Customized load."""

        if self._encoder_key in state_dict:
            state_dict_ = state_dict[self._encoder_key]
            self.encoder.load_state_dict(state_dict_, strict=strict)
        if self.post_process:
            state_dict = state_dict[self._lm_head_key]
            self.lm_head.load_state_dict(state_dict, strict=strict)
        if self.post_process and self.add_binary_head:
            state_dict = state_dict[self._binary_head_key]
            self.binary_head.load_state_dict(state_dict, strict=strict)
        if self.post_process and not self.pre_process:
            state_dict = state_dict[self._word_embeddings_for_head_key]
            self.word_embeddings.load_state_dict(state_dict, strict=strict)


class MonogatariLanguageModel(MegatronModule):
    """Main language model.

    Arguments:
        transformer_hparams: transformer hyperparameters
        vocab_size: vocabulary size
        max_sequence_length: maximum size of sequence. This
                        is used for positional embedding
        embedding_dropout_prob: dropout probability for embeddings
        num_tokentypes: size of the token-type embeddings. 0 value
                        will ignore this embedding
    """

    def __init__(
        self,
        init_method,
        output_layer_init_method,
        num_tokentypes=0,
        pre_process=True,
        post_process=True,
    ):
        super(MonogatariLanguageModel, self).__init__()
        args = get_args()

        self.embedding = Embedding(
            args.hidden_size,
            args.padded_vocab_size,
            args.max_position_embeddings,
            args.hidden_dropout,
            init_method,
            num_tokentypes,
        )
        if self.training:
            self.embedding.zero_parameters()

        self.decoder = ParallelTransformer(
            init_method,
            output_layer_init_method,
            layer_type=LayerType.decoder,
            attn_type=AttnType.mega,
            self_attn_mask_type=AttnMaskType.causal,
            pre_process=pre_process,
            post_process=post_process,
        )
        self._decoder_key = "decoder"

    def forward(
        self,
        input_ids,
        position_ids,
        attention_mask,
        labels=None,
        inference_params=None,
    ):

        output = self.decoder(input, attention_mask, inference_params)

        return output

    def state_dict_for_save_checkpoint(self, prefix="", keep_vars=False):
        """For easy load."""

        state_dict_ = {}
        state_dict_[self._decoder_key] = self.decoder.state_dict_for_save_checkpoint(
            prefix=prefix, keep_vars=keep_vars
        )

        return state_dict_

    def load_state_dict(self, state_dict, strict=True):
        """Customized load."""

        if self._decoder_key in state_dict:
            state_dict = state_dict[self._decoder_key]
            self.decoder.load_state_dict(state_dict, strict=strict)


class MonogatariModel(MegatronModule):
    """Monogatari Language model."""

    def __init__(
        self,
        num_tokentypes=0,
        parallel_output=True,
        pre_process=True,
        post_process=True,
    ):
        super(MonogatariModel, self).__init__()
        args = get_args()

        self.fp16_lm_cross_entropy = args.fp16_lm_cross_entropy

        (
            self.language_model,
            self._language_model_key,
            self.auxiliary_model,
            self._auxiliary_model_key,
        ) = get_language_model(
            num_tokentypes=num_tokentypes,
            init_method=init_method_normal(args.init_method_std),
            scaled_init_method=scaled_init_method_normal(
                args.init_method_std, args.num_layers
            ),
            pre_process=pre_process,
            post_process=post_process,
        )

        # Gradient-Disentangled Embedding Sharing from DeBERTaV3.
        # Stops auxiliary gradients from propogating through the main embeddings
        # while still retaining the training benefits of embedding sharing

        self.language_model.embedding.weight += (
            self.auxiliary_model.embedding.weight.detach()
        )

        self.initialize_word_embeddings(init_method_normal)

    def forward(
        self,
        input_ids,
        position_ids,
        attention_mask,
        padding_mask,
        labels=None,
        aux_labels=None,
        tokentype_ids=None,
        inference_params=None,
        boundaries=None,
    ):
        mask_dict, mixture_logits = self.auxiliary_model(
            input_ids,
            position_ids,
            padding_mask,
            aux_labels,
            inference_params,
            boundaries,
        )

        gen_masks = []
        layer_mix_logits = []
        layer_idx = []
        for layer in mask_dict:
            gen_masks.append(rearrange(mask_dict[layer], "... -> ... 1"))
            layer_mix_logits.append(mixture_logits[layer])
            layer_idx.append(layer)

        gen_masks = torch.cat(gen_masks, dim=-1)
        layer_mix_logits = torch.cat(layer_mix_logits, dim=-1)
        layer_mix_probs = F.softmax(layer_mix_logits.float(), dim=-1).to(
            layer_mix_logits
        )
        layer_mix_probs = rearrange(layer_mix_probs, "... -> ... 1")
        sample_logits = einsum(gen_masks.detach(), layer_mix_probs, "b s, b s s -> b s")
        sample_logits = rearrange(sample_logits, "... 1 -> ...")
        sample_probs = F.gumbel_softmax(
            sample_logits.float(), tau=args.amos_temperature, hard=True, dim=-1
        ).to(sample_logits)
        sampled_input = sample_probs.argmax(dim=-1)
        sample_probs = GradReversal.apply(sample_probs)
        embedding = self.embedding.weight
        token_embeddings = self.embedding(src_tokens)
        sampled_embeddings = einsum(sample_probs, embedding, "b s, b s -> b s")
        token_embeddings[masked_tokens] = sampled_embeddings

        lm_output = self.language_model(
            token_embeddings, position_ids, attention_mask, inference_params, boundaries
        )

        if self.post_process:
            return post_language_model_processing(
                lm_output,
                labels,
                self.embedding.weight,
                self.parallel_output,
                self.fp16_lm_cross_entropy,
            )
        else:
            return lm_output

    def state_dict_for_save_checkpoint(self, prefix="", keep_vars=False) -> output:
        """For easy load."""

        state_dict_ = {}
        state_dict_[
            self._auxiliary_model_key
        ] = self.auxiliary.state_dict_for_save_checkpoint(
            prefix=prefix, keep_vars=keep_vars
        )
        state_dict_[
            self._language_model_key
        ] = self.language_model.state_dict_for_save_checkpoint(
            prefix=prefix, keep_vars=keep_vars
        )
        if self.post_process and not self.pre_process:
            state_dict_[
                self._word_embeddings_for_head_key
            ] = self.word_embeddings.state_dict(prefix=prefix, keep_vars=keep_vars)

        return state_dict_

    def load_state_dict(self, state_dict, strict=True):
        """Customized load."""

        if self._auxiliary_model_key in state_dict:
            state_dict = state_dict[self._auxiliary_model_key]
            self.auxiliary_model.load_state_dict(state_dict, strict=strict)
        if self._language_model_key in state_dict:
            state_dict = state_dict[self._language_model_key]
            self.language_model.load_state_dict(state_dict, strict=strict)
        if self.post_process and not self.pre_process:
            state_dict = state_dict[self._word_embeddings_for_head_key]
            self.word_embeddings.load_state_dict(state_dict, strict=strict)
