import torch
import triton

from megatron.fused_kernels import flash_attention_triton


class FlashAttention(torch.autograd.Function):
    @staticmethod
    def forward(
        ctx,
        query,
        key,
        value,
        bias=None,
        dropout=0.0,
        casual=False,
        softmax_scale=None,
        sequence_parallel=False,
    ):
        query, key, value = [
            x if x.stride(-1) == 1 else x.contiguous() for x in [query, key, value]
        ]

        batch_size, seqlen_q, num_heads, head_dim = query.shape
        seqlen_k = key.shape[1]

        seqlen_q_rounded = math.ceil(seq_len / 128) * 128
        lse = torch.empty(
            (batch_size, seqlen_q, seqlen_q_rounded),
            device=query.device,
            dtype=torch.float32,
        )
        context = torch.empty_like(query)

        if bias is not None:
            assert bias.dtype in [query.dtype, torch.float]
            assert bias.is_cuda
            assert bias.dim() == 4
            if bias.stride(-1) != 1:
                bias = bias.contiguous()
            if bias.shape[2:] == (1, seqlen_k):
                bias_type = "vector"
            elif bias.shape[2:] == (seqlen_q, seqlen_k):
                bias_type = "matrix"
            else:
                raise RuntimeError(
                    "Last 2 dimensions of bias must be (1, seqlen_k)"
                    " or (seqlen_q, seqlen_k)"
                )
            bias = rearrange(
                bias,
                "... -> b s nh hd",
                b=batch_size,
                s=seqlen_q,
                nh=num_heads,
                hd=head_dim,
            )
            bias_strides = (bias.stride(0), bias.stride(1), bias.stride(2))
        else:
            bias_strides = (0, 0, 0)

        softmax_scale = softmax_scale or 1.0 / math.sqrt(query.shape[3])

        BLOCK_HEADDIM = max(triton.next_power_of_2(head_dim), 16)
        BLOCK = 128
        num_warps = 4 if query.shape[3] <= 64 else 8
        grid = lambda META: (
            triton.cdiv(seqlen_q, META["BLOCK_M"]),
            batch_size * num_heads,
        )
        flash_attention_triton._fwd_kernel[grid](
            query,
            key,
            value,
            bias,
            context,
            lse,
            softmax_scale,
            q.stride(0),
            q.stride(1),
            q.stride(2),
            k.stride(0),
            k.stride(1),
            k.stride(2),
            v.stride(0),
            v.stride(1),
            v.stride(2),
            *bias_strides,
            context.stride(0),
            context.stride(1),
            context.stride(2),
            num_heads,
            seqlen_q,
            seqlen_k,
            seqlen_q_rounded,
            head_dim,
            seqlen_q // 32,
            seqlen_k // 32,
            bias_type,
            dropout,
            causal,
            BLOCK_HEADDIM,
            BLOCK_M=BLOCK,
            BLOCK_N=BLOCK,
            num_warps=num_warps,
            num_stages=1,
        )
        ctx.save_for_backward(query, key, value, context, lse, bias)
        ctx.dropout = dropout
        ctx.causal = causal
        ctx.sequence_parallel = sequence_parallel

        return context

    @staticmethod
    def backward(ctx, d_context):
        if d_context.stride(-1) != 1:
            d_context = d_context.contiguous()

        query, key, value, context, lse, bias = ctx.saved_tensors

        # run in inference mode to prevent memcpy when triton changes tensor version
        with torch.inference_mode():
            d_query = torch.empty_like(query)
            d_key = torch.empty_like(key)
            d_value = torch.empty_like(value)

            batch_size, seqlen_q, num_heads, head_dim = query.shape
            seqlen_k = key.shape[1]

            seqlen_q_rounded = math.ceil(seqlen_q / 128) * 128
            softmax_scale = softmax_scale or 1.0 / math.sqrt(head_dim)
            query_accum = torch.empty_like(query, dtype=torch.float32)
            delta = torch.empty_like(lse)

            BLOCK_HEADDIM = max(triton.next_power_of_2(head_dim), 16)
            BLOCK = 128
            grid = lambda META: (
                triton.cdiv(seqlen_q, META["BLOCK_M"]),
                batch_size * num_heads,
            )
            flash_attention_triton._bwd_preprocess[grid](
                context,
                d_context,
                delta,
                context.stride(0),
                context.stride(1),
                context.stride(2),
                d_context.stride(0),
                d_context.stride(1),
                d_context.stride(2),
                seqlen_q,
                seqlen_q_rounded,
                num_heads,
                head_dim,
                BLOCK_HEADDIM,
                BLOCK_M=BLOCK,
            )

            if bias is not None:
                assert bias.dtype in [query.dtype, torch.float]
                assert bias.is_cuda
                assert bias.dim() == 4
                if bias.stride(-1) != 1:
                    bias = bias.contiguous()
                if bias.shape[2:] == (1, seqlen_k):
                    bias_type = "vector"
                elif bias.shape[2:] == (seqlen_q, seqlen_k):
                    bias_type = "matrix"
                else:
                    raise RuntimeError(
                        "Last 2 dimensions of bias must be (1, seqlen_k)"
                        " or (seqlen_q, seqlen_k)"
                    )
                bias = rearrange(
                    bias,
                    "... -> b s nh hd",
                    b=batch_size,
                    s=seqlen_q,
                    nh=num_heads,
                    hd=head_dim,
                )
                bias_strides = (bias.stride(0), bias.stride(1), bias.stride(2))
            else:
                bias_strides = (0, 0, 0)

            grid = lambda META: (
                triton.cdiv(seqlen_k, META["BLOCK_N"])
                if META["SEQUENCE_PARALLEL"]
                else 1,
                batch_size * num_heads,
            )
            flash_attention_triton._bwd_kernel[grid](
                query,
                key,
                value,
                d_query,
                d_key,
                d_value,
                d_context,
                lse,
                delta,
                softmax_scale,
                query.stride(0),
                query.stride(1),
                query.stride(2),
                key.stride(0),
                key.stride(1),
                key.stride(2),
                value.stride(0),
                value.stride(1),
                value.stride(2),
                *bias_strides,
                d_query.stride(0),
                d_query.stride(1),
                d_query.stride(2),
                d_key.stride(0),
                d_key.stride(1),
                d_key.stride(2),
                d_value.stride(0),
                d_value.stride(1),
                d_value.stride(2),
                d_context.stride(0),
                d_context.stride(1),
                d_context.stride(2),
                seqlen_q,
                seqlen_q_rounded,
                seqlen_k,
                num_heads,
                head_dim,
                seqlen_q // 32,
                seqlen_k // 32,
                bias_type,
                ctx.dropout,
                ctx.casual,
                ctx.sequence_parallel,
                BLOCK_HEADDIM,
            )
            d_query = query_accum

        return d_query, d_key, d_value, None, None, None
