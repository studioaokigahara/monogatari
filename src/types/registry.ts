import type {
    ModelRegistry,
    ProviderRegistry,
    Providers
} from "@/types/models";
import { OpenRouterRegistry } from "@/lib/openrouter";
import { AnthropicRegistry } from "./registry/anthropic";
import { OpenAIRegistry } from "./registry/openai";
import { GoogleRegistry } from "./registry/google";
import z from "zod";
import { DeepSeekRegistry } from "./registry/deepseek";

export const MODEL_REGISTRY: ModelRegistry = {
    openai: OpenAIRegistry,
    anthropic: AnthropicRegistry,
    google: GoogleRegistry,
    deepseek: DeepSeekRegistry,
    openrouter: OpenRouterRegistry.getModels()
};

export const PROVIDER_REGISTRY: ProviderRegistry = {
    openai: {
        name: "OpenAI",
        models: MODEL_REGISTRY.openai,
        supports: {
            streaming: true,
            tools: true,
            reasoning: true,
            logitBias: true,
            logProbs: true,
            structuredOutputs: true
        },
        samplers: ["temperature", "frequencyPenalty", "presencePenalty", "topP"]
    },
    anthropic: {
        name: "Anthropic",
        models: MODEL_REGISTRY.anthropic,
        modalities: {
            input: ["text", "image", "pdf"],
            output: ["text"]
        },
        supports: {
            streaming: true,
            tools: true
        },
        samplers: ["temperature", "topK", "topP"]
    },
    google: {
        name: "Google",
        models: MODEL_REGISTRY.google,
        modalities: {
            input: ["text", "image", "audio", "video", "pdf"],
            output: ["text"]
        },
        samplers: ["temperature", "topP"]
    },
    deepseek: {
        name: "DeepSeek",
        models: MODEL_REGISTRY.deepseek,
        modalities: {
            input: ["text"],
            output: ["text"]
        },
        samplers: ["temperature", "frequencyPenalty", "presencePenalty", "topP"]
    },
    openrouter: {
        name: "OpenRouter",
        models: MODEL_REGISTRY.openrouter,
        modalities: {
            input: [],
            output: []
        },
        samplers: [
            "temperature",
            "topP",
            "topK",
            "frequencyPenalty",
            "presencePenalty",
            "repetitionPenalty",
            "minP",
            "topA"
        ]
    }
};

const providerKeys = Object.keys(PROVIDER_REGISTRY) as Providers[];
export const ProviderSchema = z.enum(providerKeys);
export type ProviderSchema = z.infer<typeof ProviderSchema>;

export const ModelSchema = z.object(
    Object.entries(MODEL_REGISTRY).reduce(
        (acc, [provider, models]) => {
            const ids = [
                ...models.map((model) => model.id),
                ...models
                    .flatMap((model) => model.checkpoints ?? [])
                    .map((checkpoint) => checkpoint?.id)
                    .filter((id): id is string => Boolean(id))
            ];

            acc[provider as Providers] =
                ids.length === 0
                    ? z.string()
                    : ids.length === 1
                      ? z.literal(ids[0])
                      : z.union(ids.map((id) => z.literal(id)));

            return acc;
        },
        {} as { [K in Providers]: z.ZodType<string> }
    )
);
export type ModelSchema = z.infer<typeof ModelSchema>;

export function getModel<P extends Providers>(provider: P, id: string) {
    const model = MODEL_REGISTRY[provider].find(
        (model) =>
            model.id === id ||
            model.checkpoints?.some((checkpoint) => checkpoint.id === id)
    );

    if (!model) return undefined;

    const checkpoint = model.checkpoints?.find(
        (checkpoint) => checkpoint.id === id
    );

    const resolvedModel = { ...model, ...checkpoint };
    resolvedModel.supports = {
        ...PROVIDER_REGISTRY[provider].supports,
        ...model.supports,
        ...checkpoint?.supports
    };
    resolvedModel.modalities =
        checkpoint?.modalities ??
        model.modalities ??
        PROVIDER_REGISTRY[provider].modalities;

    return resolvedModel;
}
