import { ModelSchema, ProviderSchema } from "@/types/registry";
import { z } from "zod";

const ProxyProfile = z.object({
    id: z.string(),
    name: z.string().default(""),
    baseURL: z.string().default(""),
    password: z.string().optional(),
    routes: z.record(ProviderSchema, z.string()).optional()
});

export type ProxyProfile = z.infer<typeof ProxyProfile>;

const ProxySettings = z
    .object({
        profiles: z.array(ProxyProfile).default([]),
        selected: z.record(ProviderSchema, z.string()).default({
            openai: "",
            anthropic: "",
            google: "",
            deepseek: "",
            openrouter: ""
        })
    })
    .prefault({});

const Samplers = z
    .object({
        temperature: z.number().min(0).max(2).default(1),
        frequencyPenalty: z.number().min(-2).max(2).default(0),
        presencePenalty: z.number().min(-2).max(2).default(0),
        topK: z.int().nonnegative().default(0),
        topP: z.number().min(0).max(1).default(1),
        repetitionPenalty: z.number().min(0).max(2).default(1),
        minP: z.number().min(0).max(1).default(1),
        topA: z.number().min(0).max(1).default(1)
    })
    .prefault({});

export const SettingsSchema = z.object({
    provider: ProviderSchema.default("openai"),
    apiKeys: z
        .record(z.union([ProviderSchema, z.literal("chub")]), z.string())
        .default({
            openai: "",
            anthropic: "",
            google: "",
            deepseek: "",
            openrouter: "",
            chub: ""
        }),
    samplers: Samplers,
    maxOutputTokens: z.number().default(512),
    streaming: z.boolean().default(true),
    models: ModelSchema.default({
        openai: "gpt-5-chat-latest",
        anthropic: "claude-sonnet-4-5-20250929",
        google: "gemini-2.5-pro",
        deepseek: "deepseek-chat",
        openrouter: "anthropic/claude-sonnet-4.5"
    }),
    proxies: ProxySettings,
    persona: z.string().default(""),
    preset: z.string().default(""),
    explore: z
        .object({
            provider: z
                .enum(["chub", "anchorhold", "charchive"])
                .default("chub")
        })
        .prefault({}),
    cacheDepth: z.int().nonnegative().multipleOf(2).default(2)
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS = SettingsSchema.parse({});
