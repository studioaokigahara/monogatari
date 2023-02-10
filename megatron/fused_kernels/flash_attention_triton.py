"""Triton implementation of the Flash Attention algorithm. 
Original by Phil Tillet with additional modifications by Tri Dao
https://arxiv.org/pdf/2205.14135v2.pdf
https://github.com/openai/triton/blob/main/python/tutorials/06-fused-attention.py
https://github.com/HazyResearch/flash-attention/blob/main/flash_attn/flash_attn_triton.py
"""

import math

import triton
import triton.language as tl


@triton.jit
def _fwd_kernel(
    QUERY,
    KEY,
    VALUE,
    CONTEXT,
    LSE,
    BIAS,
    softmax_scale,
    stride_q0,
    stride_q1,
    stride_q2,
    stride_k0,
    stride_k1,
    stride_k2,
    stride_v0,
    stride_v1,
    stride_v2,
    stride_b0,
    stride_b1,
    stride_b2,
    stride_c0,
    stride_c1,
    stride_c2,
    seqlen_q,
    seqlen_q_rounded,
    seqlen_k,
    num_heads,
    head_dim,
    CACHE_KEY_SEQLEN_Q,
    CACHE_KEY_SEQLEN_K,
    BIAS_TYPE: tl.constexpr,
    DROPOUT: tl.constexpr,
    CASUAL: tl.constexpr,
    BLOCK_HEADDIM: tl.constexpr,
    BLOCK_M: tl.constexpr,
    BLOCK_N: tl.constexpr,
):
    # initialize offsets
    start_m = tl.program_id(0)
    offset = tl.program_id(1)
    offset_z = offset // num_heads
    offset_h = offset % num_heads
    offset_m = start_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offset_n = tl.arange(0, BLOCK_N)
    offset_hd = tl.arange(0, BLOCK_HEADDIM)
    # Initialize pointers to Q, K, V
    query_ptr = (
        QUERY
        + offset_z * stride_q0
        + offset_h * stride_q2
        + (offset_m[:, None] * stride_q1 + offset_hd[None, :])
    )
    key_ptr = (
        KEY
        + offset_z * stride_k0
        + offset_h * stride_k2
        + (offset_m[:, None] * stride_k1 + offset_hd[None, :])
    )
    value_ptr = (
        VALUE
        + offset_z * stride_v0
        + offset_h * stride_v2
        + (offset_m[:, None] * stride_v1 + offset_hd[None, :])
    )
    if BIAS_TYPE == "vector":
        bias_ptr = BIAS + offset_z * stride_b0 + offset_h * stride_b2 + offset_n
    elif BIAS_TYPE == "matrix":
        bias_ptr = (
            BIAS
            + offset_z * stride_b0
            + offset_h * stride_b2
            + (offset_m[:, None] * stride_b1 + offset_hd[None, :])
        )
    # initialize pointer to m and l
    lse_i = tl.zeros([BLOCK_M], dtype=tl.float32) - float("inf")
    m_i = tl.zeros([BLOCK_M], dtype=tl.float32) - float("inf")
    acc = tl.zeros([BLOCK_M, BLOCK_HEADDIM], dtype=tl.float32)
    # load q: it will stay in SRAM throughout
    query = tl.load(query_ptr)
    # loop over k, v and update accumulator
    end_n = seqlen_k if not CAUSAL else tl.minimum((start_m + 1) * BLOCK_M, seqlen_k)
    for start_n in range(0, end_n, BLOCK_N):
        start_n = tl.multiple_of(start_n, BLOCK_N)
        # -- compute qk ----
        key = tl.load(key_ptr)
        qk = tl.zeros([BLOCK_M, BLOCK_N], dtype=tl.float32)
        qk += tl.dot(query, tl.trans(key))
        if CASUAL:
            qk = tl.where(
                offset_m[:, None] >= (start_n + offset_n[None, :]), qk, float("-inf")
            )
        if BIAS_TYPE != "none":
            bias = tl.load(bias_ptr + start_n).to(tl.float32)
            if BIAS_TYPE == "vector":
                bias = bias[None, :]
            qk *= softmax_scale + bias
            m_ij = tl.maximum(tl.max(qk, 1), lse_i)
            prod = tl.exp(qk - m_ij[:, None])
        else:
            m_ij = tl.maximum(tl.max(qk, 1) * softmax_scale, lse_i)
            prod = tl.exp(qk * softmax_scale - m_ij[:, None])
        lse_ij = tl.sum(prod, 1)
        # dropout
        random = tl.rand(BLOCK_HEADDIM, offset_hd[None, :])
        prod_keep = random > DROPOUT
        prod = tl.where(prod_keep, prod / (1 - DROPOUT), 0.0)
        # rescale accumulator
        acc_scale = tl.exp(m_i - m_ij)
        acc *= acc_scale[:, None]
        # update acc
        value = tl.load(value_ptr)
        prod = prod.to(value.dtype)
        acc += tl.dot(prod, value)
        # update m_i and l_i
        m_i = m_ij
        lse_i = m_ij + tl.log(tl.exp(lse_i - m_ij) + lse_ij)
    # rematerialize offsets to save registers
    start_m = tl.program_id(0)
    offset_m = start_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offset_hd = tl.arange(0, BLOCK_HEADDIM)
    # write back lse
    lse_ptr = LSE + offset * seqlen_q_rounded + offset_m
    tl.store(lse_ptr, lse_i)
    # initialize pointer to accumulator output and store
    acc_ptr = (
        CONTEXT
        + offset_z * stride_c0
        + offset_h * stride_c2
        + (offset_m[:, None] * stride_c1 + offset_hd[None, :])
    )
    tl.store(acc_ptr, acc)


@triton.jit
def _bwd_preprocess(
    CONTEXT,
    D_CONTEXT,
    DELTA,
    stride_c0,
    stride_c1,
    stride_c2,
    stride_dc0,
    stride_dc1,
    stride_dc2,
    seqlen_q,
    seqlen_q_rounded,
    seqlen_k,
    num_heads,
    BLOCK_HEADDIM: tl.constexpr,
    BLOCK_M: tl.constexpr,
):
    # initialize offsets
    start_m = tl.program_id(0)
    offset = tl.program_id(1)
    offset_z = offset // num_heads
    offset_h = offset % num_heads
    offset_m = start_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offset_hd = tl.arange(0, BLOCK_HEADDIM)
    # load
    context = tl.load(
        CONTEXT
        + offset_z * stride_c0
        + offset_h * stride_c2
        + offset_m[:, None] * stride_c1
        + offset_hd[None, :],
        mask=(offset_m[:, None] < seqlen_q) & (offset_hd[None, :] < head_dim),
        other=0.0,
    ).to(tl.float32)
    d_context = tl.load(
        D_CONTEXT
        + offset_z * stride_dc0
        + offset_h * stride_dc2
        + offset_m[:, None] * stride_dc1
        + offset_hd[None, :],
        mask=(offset_m[:, None] < seqlen_q) & (offset_hd[None, :] < head_dim),
        other=0.0,
    ).to(tl.float32)
    # compute
    delta = tl.sum(context * d_context, axis=1)
    # write-back
    tl.store(DELTA + offset * seqlen_q_rounded + offset_m, delta)


@triton.jit
def _bwd_kernel(
    QUERY,
    KEY,
    VALUE,
    D_QUERY,
    D_KEY,
    D_VALUE,
    D_CONTEXT,
    LSE,
    DELTA,
    BIAS,
    softmax_scale,
    stride_q0,
    stride_q1,
    stride_q2,
    stride_k0,
    stride_k1,
    stride_k2,
    stride_v0,
    stride_v1,
    stride_v2,
    stride_b0,
    stride_b1,
    stride_b2,
    stride_dq0,
    stride_dq1,
    stride_dq2,
    stride_dk0,
    stride_dk1,
    stride_dk2,
    stride_dv0,
    stride_dv1,
    stride_dv2,
    stride_dc0,
    stride_dc1,
    stride_dc2,
    seqlen_q,
    seqlen_q_rounded,
    seqlen_k,
    num_heads,
    head_dim,
    CACHE_KEY_SEQLEN_Q,
    CACHE_KEY_SEQLEN_K,
    BIAS_TYPE: tl.constexpr,
    DROPOUT: tl.constexpr,
    CASUAL: tl.constexpr,
    SEQUENCE_PARALLEL: tl.constexpr,
    BLOCK_HEADDIM: tl.constexpr,
    BLOCK_M: tl.constexpr,
    BLOCK_N: tl.constexpr,
):
    offset = tl.program_id(1)
    offset_z = offset // num_heads
    offset_h = offset % num_heads
    # offset pointers for batch/head
    QUERY += offset_z * stride_q0 + offset_h * stride_q2
    KEY += offset_z * stride_k0 + offset_h * stride_k2
    VALUE += offset_z * stride_v0 + offset_h * stride_v2
    D_CONTEXT += offset_z * stride_dc0 + offset_h * stride_dc2
    D_QUERY += offset_z * stride_dq0 + offset_h * stride_dq2
    D_KEY += offset_z * stride_dk0 + offset_h * stride_dk2
    D_VALUE += offset_z * stride_dv0 + offset_h * stride_dv2
    LSE += offset * seqlen_q_rounded
    DELTA += offset * seqlen_q_rounded
    if BIAS_TYPE != "none":
        BIAS += offset_z * stride_b0 + offset_h * stride_b2
    num_blocks = tl.cdiv(seqlen_k, BLOCK_N) if SEQUENCE_PARALLEL else tl.program_id(0)
    for start_n in range(num_blocks):
        lo = start_n * BLOCK_M
        # initialize row/col offsets
        offset_lm = lo + tl.arange(0, BLOCK_M)
        offset_nm = start_n * BLOCK_M + tl.arange(0, BLOCK_M)
        offset_hd = tl.arange(0, BLOCK_HEADDIM)
        offset_n = tl.arange(0, BLOCK_N)
        # initialize pointers to value-like data
        query_ptr = Q + (offset_lm[:, None] * stride_q1 + offset_hd[None, :])
        key_ptr = K + (offset_nm[:, None] * stride_k1 + offset_hd[None, :])
        value_ptr = V + (offset_nm[:, None] * stride_v1 + offset_hd[None, :])
        d_context_ptr = D_CONTEXT + (
            offset_lm[:, None] * stride_dc1 + offset_hd[None, :]
        )
        d_query_ptr = D_QUERY + (offset_lm[:, None] * stride_dq1 + offset_hd[None, :])
        if BIAS_TYPE == "vector":
            bias_ptr = BIAS + offset_nm
        elif BIAS_TYPE == "matrix":
            bias_ptr = BIAS + (offset_lm[:, None] * stride_b1 + offset_nm[None, :])
        # initialize dv amd dk
        d_key = tl.zeros([BLOCK_M, BLOCK_DMODEL], dtype=tl.float32)
        d_value = tl.zeros([BLOCK_M, BLOCK_DMODEL], dtype=tl.float32)
        # k and v stay in SRAM throughout
        key = tl.load(key_ptr)
        value = tl.load(value_ptr)
        # loop over rows
        for start_m in range(lo, num_block * BLOCK_M, BLOCK_M):
            start_m = tl.multiple_of(start_m, BLOCK_M)
            curr_offset = start_m + offset_n
            # load q, k, v, do on-chip
            query = tl.load(query_ptr)
            # recompute p = softmax(qk, dim=-1).T
            # NOTE: `do` is pre-divided by `l`; no normalization here
            qk = tl.dot(query, tl.trans(key))
            if CASUAL:
                qk = tl.where(
                    curr_offset[:, None] >= (offset_nm[None, :]), qk, float("-inf")
                )
            if BIAS_TYPE != "none":
                bias = tl.load(bias_ptr).to(tl.float32)
            lse_i = tl.load(LSE + offs_m_curr)
            if BIAS_TYPE == "none":
                prod = tl.exp(qk * softmax_scale - lse_i[:, None])
            else:
                prod = tl.exp(qk - lse_i[:, None])
            # dropout
            random = tl.rand(BLOCK_HEADDIM, offset_hd[None, :])
            prod_keep = random > DROPOUT
            prod = tl.where(prod_keep, prod / (1 - DROPOUT), 0.0)
            # compute dv
            d_context = tl.load(d_context_ptr)
            d_value += tl.dot(tl.trans(prod.to(tl.float16)), d_context)
            # compute dp
            dp = tl.zeros([BLOCK_M, BLOCK_N], dtype=tl.float32)
            dp += tl.dot(d_context, tl.trans(value))
            # compute ds
            # Putting the subtraction after the dp matmul (instead of before) is slightly faster
            Delta_i = tl.load(DELTA + curr_offset)
            ds = (prod * (dp - Delta_i[:, None]) * softmax_scale).to(query.dtype)
            # compute dk
            d_key += tl.dot(tl.trans(ds.to(tl.float16)), query)
            if not SEQUENCE_PARALLEL:
                d_query = tl.load(d_query_ptr, eviction_policy="evict_last")
                d_query += tl.dot(ds, key)
                tl.store(d_query_ptr, d_query, eviction_policy="evict_last")
            else:
                d_query = tl.dot(ds, key)
                tl.atomic_add(d_query_ptr, d_query)
            # increment pointers
            query_ptr += BLOCK_M * stride_q1
            d_query_ptr += BLOCK_M * stride_dq1
            d_context_ptr += BLOCK_M * stride_dc1
            if BIAS_TYPE == "matrix":
                bias_ptr += BLOCK_M * stride_b1
        # write-back
        d_key_ptr = D_KEY + (offset_nm[:, None] * stride_dk1 + offset_hd[None, :])
        d_value_ptr = D_VALUE + (offset_nm[:, None] * stride_dv1 + offset_hd[None, :])
        tl.store(d_key_ptr, d_key)
        tl.store(d_value_ptr, d_value)
