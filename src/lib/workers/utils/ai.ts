import { Settings } from "@/types/settings";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createProviderRegistry, ModelMessage } from "ai";

export function createRegistry(settings: Settings) {
    const provider = settings.provider;
    const model = settings.models[provider];
    const modelID = `${provider}:${model}` as never;

    const proxyID = settings.proxies.selected[provider];
    const proxy = settings.proxies.profiles.find((profile) => profile.id === proxyID);

    const apiKey = settings.apiKeys[provider] || "";
    const registry = createProviderRegistry({
        openai: createOpenAI({
            baseURL: proxy?.baseURL || "",
            apiKey: proxy?.password || apiKey
        }),
        anthropic: createAnthropic({
            baseURL: proxy?.baseURL || "",
            apiKey: proxy?.password || apiKey
        }),
        google: createGoogleGenerativeAI({
            baseURL: proxy?.baseURL || "",
            apiKey: proxy?.password || apiKey
        }),
        deepseek: createDeepSeek({
            baseURL: proxy?.baseURL || "",
            apiKey: proxy?.password || apiKey
        }),
        // @ts-expect-error openrouter not yet updated to support v6 types
        openrouter: createOpenRouter({
            apiKey: proxy?.password || apiKey
        })
    });

    return { registry, modelID };
}

export function applyCacheControl(
    messages: ModelMessage[],
    provider: string,
    model: unknown,
    cacheDepth: number
) {
    const isAnthropic = provider === "anthropic" || (model as string).split("/")[0] === "anthropic";

    if (!isAnthropic || cacheDepth < 0 || cacheDepth >= messages.length) {
        return messages;
    }

    const targetDepths = [cacheDepth, cacheDepth + 2, cacheDepth + 4, cacheDepth + 8];

    let prefillSkipped = false;
    let depth = 0;
    let previousRole = "";

    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];

        if (message.role !== "user" && message.role !== "assistant") continue;
        if (!prefillSkipped && message.role === "assistant") continue;

        prefillSkipped = true;

        if (message.role === previousRole) continue;

        if (targetDepths.includes(depth)) {
            if (Array.isArray(message.content) && message.role === "user") {
                const breakpoint = message.content.findLastIndex((part) => part.type === "text");
                if (breakpoint !== -1) {
                    message.content[breakpoint] = {
                        ...message.content[breakpoint],
                        providerOptions: {
                            ...message.content[breakpoint].providerOptions,
                            [provider]: { cacheControl: { type: "ephemeral" } }
                        }
                    };
                }
            } else {
                message.providerOptions = {
                    ...message.providerOptions,
                    [provider]: { cacheControl: { type: "ephemeral" } }
                };
            }
        }

        if (depth >= targetDepths[targetDepths.length - 1]) break;

        depth++;
        previousRole = message.role;
    }

    return messages;
}
