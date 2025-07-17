import { nanoid } from "@/lib/utils";
import type { Settings } from "@/types/settings";
import { createOpenAI } from "@ai-sdk/openai";
import {
    createProviderRegistry,
    embed,
    experimental_generateImage as generateImage,
    generateText,
    streamText
} from "ai";

class Deferred<T> {
    promise: Promise<T>;
    resolve!: (value: T) => void;
    reject!: (error?: unknown) => void;
    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

const SETTINGS_CACHE = "sw-settings-store";
const SETTINGS_KEY = "settings.json";

const settingsReady = new Deferred<Settings>();
let settings: Settings;
let registry = createProviderRegistry({});
const providerOptions = {
    openai: {
        store: false
    }
};

async function saveSettings(settings: Settings) {
    const cache = await caches.open(SETTINGS_CACHE);
    await cache.put(SETTINGS_KEY, new Response(JSON.stringify(settings)));
}

async function loadSettings() {
    const cache = await caches.open(SETTINGS_CACHE);
    const response = await cache.match(SETTINGS_KEY);

    if (response) {
        try {
            settings = (await response.json()) as Settings;
            initializeRegistry(settings);
            settingsReady.resolve(settings);
            console.log("Hydrated settings:", settings);
        } catch (error) {
            console.log("Settings hydration failed:", error);
        }
    }
}

loadSettings();

function initializeRegistry(settings: Settings) {
    const provider = settings.provider;
    const proxyID = settings.proxies.selected[provider];
    const proxy = settings.proxies.profiles.find(
        (profile) => profile.id === proxyID
    );
    const apiKey =
        (settings as Extract<Settings, { provider: "openai" }>).openaiKey || "";
    registry = createProviderRegistry({
        openai: createOpenAI({
            baseURL: proxy?.baseURL || "",
            apiKey: proxy?.password || apiKey
        })
    });
}

self.addEventListener("install", (event: ExtendableEvent) =>
    event.waitUntil(self.skipWaiting())
);
self.addEventListener("activate", (event: ExtendableEvent) =>
    event.waitUntil(
        (async () => {
            self.clients.claim();
            await loadSettings();
        })()
    )
);

self.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "SETTINGS" && message.settings) {
        settings = message.settings as Settings;
        initializeRegistry(settings);
        saveSettings(settings);
        settingsReady.resolve(settings);
        console.log("Received fresh settings:", settings);
    }
});

self.addEventListener("fetch", (event: FetchEvent) => {
    if (event.request.method !== "POST") return;
    const url = new URL(event.request.url);

    event.respondWith(
        (async () => {
            let settings: Settings;
            const timeout = "Service Worker timed out waiting for settings";

            try {
                settings = await Promise.race<Settings>([
                    settingsReady.promise,
                    new Promise<Settings>((_resolve, reject) =>
                        setTimeout(() => reject(new Error(timeout)), 5000)
                    )
                ]);
            } catch {
                return new Response(JSON.stringify({ error: timeout }), {
                    headers: { "Content-Type": "application/json" },
                    status: 503
                });
            }

            switch (url.pathname) {
                case "/api/chat":
                    return stream(event.request, settings);
                case "/api/chat/completion":
                    return completion(event.request, settings);
                case "/api/generate/image":
                    return image(event.request);
                case "/api/generate/embed":
                    return generateEmbed(event.request);
                default:
                    return new Response("Not found", { status: 404 });
            }
        })()
    );
});

async function stream(request: Request, settings: Settings) {
    const { messages } = await request.json();
    const provider = settings.provider;
    const model = settings.models[provider];
    const modelID = `${provider}:${model}` as never;

    const result = streamText({
        model: registry.languageModel(modelID),
        messages,
        providerOptions,
        maxTokens: settings.maxOutputTokens,
        temperature: settings.temperature,
        topP: settings.top_p,
        experimental_generateMessageId: () => nanoid()
    });

    result.consumeStream();
    return result.toDataStreamResponse({ sendReasoning: true });
}

async function completion(request: Request, settings: Settings) {
    const { messages } = await request.json();
    const provider = settings.provider;
    const model = settings.models[provider];
    const modelID = `${provider}:${model}` as never;

    const { text } = await generateText({
        model: registry.languageModel(modelID),
        messages,
        providerOptions,
        maxTokens: settings.maxOutputTokens,
        temperature: settings.temperature,
        topP: settings.top_p,
        experimental_generateMessageId: () => nanoid()
    });

    return new Response(text, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}

async function image(request: Request) {
    const { model, prompt } = await request.json();

    const { image } = await generateImage({
        model: registry.imageModel(model as never),
        prompt: prompt
    });

    const blob = new Blob([image.uint8Array], { type: "image/png" });
    return new Response(blob, { headers: { "Content-Type": "image/png" } });
}

async function generateEmbed(request: Request) {
    if (!settings) throw new Error("Settings not initialized");
    const { model, value } = await request.json();

    const { embedding } = await embed({
        model: registry.textEmbeddingModel(model as never),
        value
    });

    return new Response(JSON.stringify(embedding), {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}
