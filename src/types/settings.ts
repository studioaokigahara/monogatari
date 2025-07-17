import { ModelsSchema, ProviderSchema } from "@/types/registry";
import { z } from "zod";

const ProxyProfile = z.object({
    id: z.string(),
    name: z.string().default(""),
    baseURL: z.string().default(""),
    password: z.string().optional(),
    routes: z.record(ProviderSchema, z.string()).optional()
});

const ProxySettings = z
    .object({
        profiles: z.array(ProxyProfile).default([]),
        selected: z.record(ProviderSchema, z.string()).default({})
    })
    .default({});

const Settings = z.object({
    provider: z.string().default("openai"),
    temperature: z.number().default(1),
    maxOutputTokens: z.number().default(512),
    top_p: z.number().default(1),
    streaming: z.boolean().default(true),
    chub: z
        .object({
            apiKey: z.string().default("")
        })
        .default({}),
    models: ModelsSchema,
    proxies: ProxySettings,
    persona: z.string().default(""),
    promptSet: z.string().default("")
});

const OpenAISettings = Settings.extend({
    provider: z.literal("openai"),
    openaiKey: z.string().optional()
});

const AnthropicSettings = Settings.extend({
    provider: z.literal("anthropic"),
    anthropicKey: z.string().optional()
});

const GoogleSettings = Settings.extend({
    provider: z.literal("google"),
    googleKey: z.string().optional()
});

export const SettingsSchema = z.discriminatedUnion("provider", [
    OpenAISettings,
    AnthropicSettings,
    GoogleSettings
]);

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS = SettingsSchema.parse({ provider: "openai" });
