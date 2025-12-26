import { db } from "@/database/monogatari-db";
import { generateCuid2 } from "@/lib/utils";
import { type Message } from "@/types/message";
import { type Settings } from "@/types/settings";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
    convertToModelMessages,
    createProviderRegistry,
    // embed,
    // experimental_generateImage as generateImage,
    generateText,
    ModelMessage,
    smoothStream,
    streamText
} from "ai";
import { clientsClaim } from "workbox-core";

const providerOptions = {
    openai: {
        store: false
    }
};

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

self.addEventListener("fetch", (event: FetchEvent) => {
    const url = new URL(event.request.url);

    if (event.request.method === "GET" && url.pathname.startsWith("/images/")) {
        event.respondWith(image(event.request));
        return;
    }

    if (event.request.method === "POST") {
        event.respondWith(
            (() => {
                switch (url.pathname) {
                    case "/api/chat":
                        return stream(event.request);
                    case "/api/chat/completions":
                        return completion(event.request);
                    // case "/api/generate/image":
                    //     return image(event.request);
                    // case "/api/generate/embed":
                    //     return generateEmbed(event.request);
                    default:
                        return new Response("Endpoint not found.", {
                            status: 404
                        });
                }
            })()
        );
    }
});

function createRegistry(settings: Settings) {
    const provider = settings.provider;
    const model = settings.models[provider];
    const modelID = `${provider}:${model}` as never;

    const proxyID = settings.proxies.selected[provider];
    const proxy = settings.proxies.profiles.find(
        (profile) => profile.id === proxyID
    );

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
        openrouter: createOpenRouter({
            apiKey: proxy?.password || apiKey
        })
    });

    return { registry, modelID };
}

function applyCacheControl(
    messages: ModelMessage[],
    provider: string,
    model: unknown,
    cacheDepth: number
) {
    const isAnthropic =
        provider === "anthropic" ||
        (model as string).split("/")[0] === "anthropic";

    if (!isAnthropic || cacheDepth < 0 || cacheDepth >= messages.length) {
        return messages;
    }

    const targetDepths = [
        cacheDepth,
        cacheDepth + 2,
        cacheDepth + 4,
        cacheDepth + 8
    ];

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
                const breakpoint = message.content.findLastIndex(
                    (part) => part.type === "text"
                );
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

interface ChatRequest {
    messages: Message[];
    settings: Settings;
}

async function stream(request: Request) {
    const { messages, settings }: ChatRequest = await request.json();

    const { registry, modelID } = createRegistry(settings);

    let modelMessages = await convertToModelMessages(messages);
    modelMessages = applyCacheControl(
        modelMessages,
        settings.provider,
        settings.models[settings.provider],
        settings.cacheDepth
    );

    const startTimestamp = Date.now();
    const result = streamText({
        model: registry.languageModel(modelID),
        messages: modelMessages,
        providerOptions,
        maxOutputTokens: settings.maxOutputTokens,
        temperature: settings.samplers.temperature,
        frequencyPenalty: settings.samplers.frequencyPenalty,
        presencePenalty: settings.samplers.presencePenalty,
        topK: settings.samplers.topK,
        topP: settings.samplers.topP,
        experimental_transform: smoothStream()
    });

    return result.toUIMessageStreamResponse({
        generateMessageId: () => generateCuid2(),
        messageMetadata: ({ part }) => {
            switch (part.type) {
                case "start":
                    return {
                        model: modelID,
                        createdAt: new Date()
                    };
                case "finish-step":
                    return {
                        usage: {
                            inputTokens: part.usage.inputTokens,
                            inputTokenDetails: part.usage.inputTokenDetails,
                            outputTokens: part.usage.outputTokens,
                            outputTokenDetails: part.usage.outputTokenDetails,
                            totalTokens: part.usage.totalTokens,
                            tokensPerSecond:
                                part.usage.outputTokens! /
                                ((Date.now() - startTimestamp) / 1000)
                        }
                    };
                case "finish":
                    return {
                        totalUsage: {
                            inputTokens: part.totalUsage.inputTokens,
                            inputTokenDetails:
                                part.totalUsage.inputTokenDetails,
                            outputTokens: part.totalUsage.outputTokens,
                            outputTokenDetails:
                                part.totalUsage.outputTokenDetails,
                            totalTokens: part.totalUsage.totalTokens
                        }
                    };
            }
        }
    });
}

async function completion(request: Request) {
    const { messages, settings }: ChatRequest = await request.json();

    const { registry, modelID } = createRegistry(settings);

    let modelMessages = await convertToModelMessages(messages);
    modelMessages = applyCacheControl(
        modelMessages,
        settings.provider,
        settings.models[settings.provider],
        settings.cacheDepth
    );

    const { text } = await generateText({
        model: registry.languageModel(modelID),
        messages: modelMessages,
        providerOptions,
        maxOutputTokens: settings.maxOutputTokens,
        temperature: settings.samplers.temperature,
        frequencyPenalty: settings.samplers.frequencyPenalty,
        presencePenalty: settings.samplers.presencePenalty,
        topK: settings.samplers.topK,
        topP: settings.samplers.topP
    });

    return new Response(text, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}

// async function image(request: Request) {
//     const { model, prompt } = await request.json();

//     const { image } = await generateImage({
//         model: registry.imageModel(model as never),
//         prompt: prompt
//     });

//     const blob = new Blob([image.uint8Array], { type: "image/png" });
//     return new Response(blob, { headers: { "Content-Type": "image/png" } });
// }

// async function generateEmbed(request: Request) {
//     if (!settings) throw new Error("Settings not initialized");
//     const { model, value } = await request.json();

//     const { embedding } = await embed({
//         model: registry.textEmbeddingModel(model as never),
//         value
//     });

//     return new Response(JSON.stringify(embedding), {
//         headers: { "Content-Type": "text/plain; charset=utf-8" }
//     });
// }

async function image(request: Request) {
    const cache = await caches.open("images");
    const cacheControl = "public, max-age=0, must-revalidate";

    const cachedResponse = await cache.match(request, { ignoreVary: true });
    if (cachedResponse) {
        const noneMatch = request.headers.get("If-None-Match");
        const etag = cachedResponse.headers.get("ETag");
        if (noneMatch && etag && noneMatch === etag) {
            return new Response(null, {
                status: 304,
                headers: new Headers({
                    ETag: etag,
                    "Cache-Control":
                        cachedResponse.headers.get("Cache-Control") ||
                        cacheControl
                })
            });
        }
        return cachedResponse;
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    if (parts.length < 4) return new Response("Bad Request", { status: 400 });

    const namespace = parts[2];
    const id = decodeURIComponent(parts[3]);
    const rest = parts.slice(4);

    let file: File | undefined;
    let lastModified: number | undefined;

    if (namespace === "characters") {
        const filename = decodeURIComponent(rest.join("/"));
        if (!id || !filename) {
            return new Response("Bad Request: Missing ID or file name", {
                status: 400
            });
        }

        const asset = await db.assets.get({
            "[parentID+file.name]": [id, filename]
        });

        if (asset) {
            file = asset.file;
            lastModified = asset.file.lastModified;
        }
    } else if (namespace === "personas") {
        if (!id) {
            return new Response("Bad Request: Missing ID", { status: 400 });
        }

        const asset = await db.assets.get({
            "[category+parentID]": ["persona", id.split(".")[0]]
        });

        if (asset) {
            file = asset.file;
            lastModified = asset.file.lastModified;
        }
    } else {
        return new Response("Bad Request: Invalid Namespace", { status: 400 });
    }

    if (!file) return new Response("Asset not found", { status: 404 });

    const headers = new Headers({
        "Cache-Control": cacheControl,
        "Content-Disposition": `inline; filename="${file.name}"`,
        "Content-Length": String(file.size),
        "Content-Type": file.type
    });

    const etag = lastModified ? String(lastModified) : undefined;
    if (etag) headers.set("ETag", etag);

    const noneMatch = request.headers.get("If-None-Match");
    if (etag && noneMatch === etag) {
        return new Response(null, { status: 304, headers });
    }

    const response = new Response(file, { status: 200, headers });
    await cache.put(request, response.clone());
    return response;
}
