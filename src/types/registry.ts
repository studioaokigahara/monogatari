import type {
    ModelRegistry,
    ProviderRegistry,
    Providers,
} from "@/types/models";
import { z } from "zod";

export const MODEL_REGISTRY: ModelRegistry = {
    openai: [
        {
            id: "gpt-3.5-turbo",
            name: "GPT‑3.5 Turbo",
            contextLength: 16384,
            maxOutputTokens: 4096,
            supports: {
                streaming: true,
                imageInput: false,
                structuredOutput: false,
                tools: true,
                reasoning: false,
                logprobs: true,
            },
            checkpoints: [
                {
                    id: "gpt-3.5-turbo-0125",
                },
                {
                    id: "gpt-3.5-turbo-1106",
                },
                {
                    id: "gpt-3.5-turbo-instruct",
                },
            ],
        },
        {
            id: "gpt-4",
            name: "GPT‑4",
            contextLength: 8192,
            maxOutputTokens: 8192,
            supports: {
                streaming: true,
                imageInput: false,
                structuredOutput: false,
                tools: false,
                reasoning: false,
                logprobs: true,
            },
            checkpoints: [
                {
                    id: "gpt-4-0613",
                },
                {
                    id: "gpt-4-0314",
                },
            ],
        },
        {
            id: "gpt-4-turbo",
            name: "GPT‑4 Turbo",
            contextLength: 128000,
            maxOutputTokens: 4096,
            supports: {
                streaming: true,
                imageInput: false,
                structuredOutput: false,
                tools: false,
                reasoning: false,
                logprobs: true,
            },
            checkpoints: [
                {
                    id: "gpt-4-turbo-2024-04-09",
                    supports: { imageInput: true, tools: true },
                },
                {
                    id: "gpt-4-0125-preview",
                },
                {
                    id: "gpt-4-1106-preview",
                },
                {
                    id: "gpt-4-1106-vision-preview",
                    supports: { imageInput: true },
                },
            ],
        },
        {
            id: "gpt-4o",
            name: "GPT‑4o",
            contextLength: 128000,
            maxOutputTokens: 16384,
            supports: {
                streaming: true,
                imageInput: true,
                structuredOutput: true,
                tools: true,
                reasoning: false,
                logprobs: true,
            },
            checkpoints: [
                {
                    id: "chatgpt-4o-latest",
                    name: "ChatGPT-4o",
                    description:
                        "ChatGPT-4o points to the GPT-4o snapshot currently used in ChatGPT.",
                    price: {
                        input: 5,
                        output: 15,
                    },
                    contextLength: 128000,
                    maxOutputTokens: 16384,
                    supports: {
                        structuredOutput: false,
                    },
                },
                {
                    id: "gpt-4o-2024-11-20",
                },
                {
                    id: "gpt-4o-2024-08-06",
                },
                {
                    id: "gpt-4o-mini-2024-07-18",
                    name: "GPT‑4o mini",
                    maxOutputTokens: 4096,
                },
                {
                    id: "gpt-4o-2024-05-13",
                },
            ],
        },
        {
            id: "gpt-4.1",
            name: "GPT-4.1",
            contextLength: 1047576,
            maxOutputTokens: 32768,
            supports: {
                streaming: true,
                imageInput: true,
                structuredOutput: true,
                tools: true,
                reasoning: false,
                logprobs: true,
            },
            checkpoints: [
                {
                    id: "gpt-4.1-2025-04-14",
                    name: "GPT-4.1",
                    price: {
                        input: 2,
                        output: 8,
                    },
                },
                {
                    id: "gpt-4.1-mini-2025-04-14",
                    name: "GPT-4.1 mini",
                    price: {
                        input: 0.4,
                        output: 1.6,
                    },
                },
                {
                    id: "gpt-4.1-nano-2025-04-14",
                    name: "GPT-4.1 nano",
                    price: {
                        input: 0.1,
                        output: 0.4,
                    },
                },
            ],
        },
        {
            id: "gpt-4.5-preview-2025-02-27",
            name: "GPT-4.5",
            description: "Will be deprecated on 2025-07-14.",
            price: {
                input: 75,
                output: 150,
            },
            contextLength: 128000,
            maxOutputTokens: 16384,
            supports: {
                streaming: true,
                imageInput: true,
                structuredOutput: true,
                tools: true,
                reasoning: false,
                logprobs: true,
            },
        },
    ],
    anthropic: [
        {
            id: "claude-3",
            name: "Claude 3",
            contextLength: 200000,
            maxOutputTokens: 4096,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: false,
            },
            checkpoints: [
                {
                    id: "claude-3-opus-20240229",
                    name: "Claude 3 Opus",
                },
                {
                    id: "claude-3-sonnet-20240229",
                    name: "Claude 3 Sonnet",
                },
                {
                    id: "claude-3-haiku-20240307",
                    name: "Claude 3 Haiku",
                },
            ],
        },
        {
            id: "claude-3-5",
            name: "Claude 3.5",
            contextLength: 200000,
            maxOutputTokens: 4096,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: false,
            },
            checkpoints: [
                {
                    id: "claude-3-5-sonnet-20241022",
                    name: "Claude 3.5 Sonnet V2",
                },
                {
                    id: "claude-3-5-sonnet-20240620",
                    name: "Claude 3.5 Sonnet",
                },
                {
                    id: "claude-3-5-haiku-20241022",
                    name: "Claude 3.5 Haiku",
                },
            ],
        },
        {
            id: "claude-3-7-sonnet-20250219",
            name: "Claude 3.7 Sonnet",
            contextLength: 200000,
            maxOutputTokens: 64000,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: true,
            },
        },
    ],
    azure: [],
    xai: [],
    "amazon-bedrock": [],
    google: [
        {
            id: "gemini-1.5",
            name: "Gemini 1.5",
            contextLength: 1048576,
            maxOutputTokens: 8192,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: false,
            },
            checkpoints: [
                {
                    id: "gemini-1.5-pro",
                    name: "Gemini 1.5 Pro",
                    contextLength: 2097152,
                },
                {
                    id: "gemini-1.5-flash",
                    name: "Gemini 1.5 Flash",
                },
                {
                    id: "gemini-1.5-flash-8b",
                    name: "Gemini 1.5 Flash 8B",
                },
            ],
        },
        {
            id: "gemini-2.0",
            name: "Gemini 2.0",
            contextLength: 1048576,
            maxOutputTokens: 8192,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: false,
            },
            checkpoints: [
                {
                    id: "gemini-2.0-flash",
                    name: "Gemini 2.0 Flash",
                },
                // {
                //     id: "gemini-2.0-flash-preview-image-generation",
                //     name: "Gemini 2.0 Flash (Image Generation Preview)",
                // },
                {
                    id: "gemini-2.0-flash-lite",
                    name: "Gemini 2.0 Flash-Lite",
                },
                // {
                //     id: "gemini-2.0-flash-live-001",
                //     name: "Gemini 2.0 Flash Live",
                // },
            ],
        },
        {
            id: "gemini-2.5",
            name: "Gemini 2.5",
            contextLength: 1048576,
            maxOutputTokens: 65536,
            supports: {
                streaming: true,
                imageInput: true,
                tools: true,
                reasoning: true,
            },
            checkpoints: [
                {
                    id: "gemini-2.5-pro-preview-05-06",
                    name: "Gemini 2.5 Pro Preview",
                },
                {
                    id: "gemini-2.5-flash-preview-04-17",
                    name: "Gemini 2.5 Flash Preview",
                },
            ],
        },
    ],
    "google-vertex": [],
    mistral: [],
    togetherai: [],
    cohere: [],
    fireworks: [],
    deepinfra: [],
    deepseek: [
        {
            id: "deepseek-reasoner",
            name: "DeepSeek R1",
            contextLength: 65536,
            maxOutputTokens: 65536,
            supports: {
                streaming: true,
                imageInput: false,
                tools: true,
                reasoning: true,
            },
        },
        {
            id: "deepseek-chat",
            name: "DeepSeek V3",
            contextLength: 65536,
            maxOutputTokens: 65536,
            supports: {
                streaming: true,
                imageInput: false,
                tools: true,
                reasoning: false,
            },
        },
    ],
    cerebras: [],
    groq: [],
    perplexity: [],
    elevenlabs: [],
    lmnt: [],
    hume: [],
    revai: [],
    deepgram: [],
    gladia: [],
};

export const PROVIDER_REGISTRY: ProviderRegistry = {
    openai: {
        name: "OpenAI",
        models: MODEL_REGISTRY.openai,
    },
    anthropic: {
        name: "Anthropic",
        models: MODEL_REGISTRY.anthropic,
    },
    azure: {
        name: "Microsoft Azure",
        models: MODEL_REGISTRY.azure,
    },
    xai: {
        name: "xAI",
        models: MODEL_REGISTRY.xai,
    },
    "amazon-bedrock": {
        name: "Amazon Bedrock",
        models: MODEL_REGISTRY["amazon-bedrock"],
    },
    google: {
        name: "Google",
        models: MODEL_REGISTRY.google,
    },
    "google-vertex": {
        name: "Google Vertex AI",
        models: MODEL_REGISTRY["google-vertex"],
    },
    mistral: {
        name: "Mistral",
        models: MODEL_REGISTRY.mistral,
    },
    togetherai: {
        name: "TogetherAI",
        models: MODEL_REGISTRY.togetherai,
    },
    cohere: {
        name: "Cohere",
        models: MODEL_REGISTRY.cohere,
    },
    fireworks: {
        name: "Fireworks",
        models: MODEL_REGISTRY.fireworks,
    },
    deepinfra: {
        name: "DeepInfra",
        models: MODEL_REGISTRY.deepinfra,
    },
    deepseek: {
        name: "DeepSeek",
        models: MODEL_REGISTRY.deepseek,
    },
    cerebras: {
        name: "Cerebras",
        models: MODEL_REGISTRY.cerebras,
    },
    groq: {
        name: "Groq",
        models: MODEL_REGISTRY.groq,
    },
    perplexity: {
        name: "Perplexity",
        models: MODEL_REGISTRY.perplexity,
    },
    elevenlabs: {
        name: "ElevenLabs",
        models: MODEL_REGISTRY.elevenlabs,
    },
    lmnt: {
        name: "LMNT",
        models: MODEL_REGISTRY.lmnt,
    },
    hume: {
        name: "Hume",
        models: MODEL_REGISTRY.hume,
    },
    revai: {
        name: "Rev.ai",
        models: MODEL_REGISTRY.revai,
    },
    deepgram: {
        name: "Deepgram",
        models: MODEL_REGISTRY.deepgram,
    },
    gladia: {
        name: "Gladia",
        models: MODEL_REGISTRY.gladia,
    },
};

const rawProviders = Object.keys(PROVIDER_REGISTRY) as Providers[];
const [firstProvider, ...restProviders] = rawProviders;
const providerKeys = [firstProvider, ...restProviders] as [
    Providers,
    ...Providers[],
];

export const ProviderSchema = z.enum(providerKeys);
export const ModelSchema = providerKeys.reduce(
    (acc, provider) => {
        const ids = [
            ...MODEL_REGISTRY[provider].map((m) => m.id),
            ...MODEL_REGISTRY[provider]
                .flatMap((m) => m.checkpoints ?? [])
                .map((c) => c.id),
        ] as [string, ...string[]];

        acc[provider] = z.enum(ids);
        return acc;
    },
    {} as Record<Providers, z.ZodEnum<[string, ...string[]]>>,
);
export const ModelsSchema = z
    .object(
        (Object.keys(ModelSchema) as Providers[]).reduce(
            (acc, provider) => {
                acc[provider] = ModelSchema[provider].optional();
                return acc;
            },
            {} as Record<Providers, z.ZodTypeAny>,
        ),
    )
    .default({});

export function getModel<
    P extends Providers,
    ID extends ModelRegistry[P][number]["id"],
>(
    provider: P,
    id: ID,
): Extract<ModelRegistry[P][number], { id: ID }> | undefined {
    return MODEL_REGISTRY[provider].find(
        (m) => m.id === id || m.checkpoints?.find((c) => c.id === id),
    ) as any;
}

export function getCheckpoint<
    P extends Providers,
    ID extends ModelRegistry[P][number]["id"],
>(
    provider: P,
    id: ID,
): Extract<ModelRegistry[P][number]["checkpoints"], { id: ID }> | undefined {
    const model = getModel(provider, id);
    return (
        (model?.checkpoints?.find((c) => c.id === id) as any) || (model as any)
    );
}
