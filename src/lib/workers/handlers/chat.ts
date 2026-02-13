import { generateCuid2 } from "@/lib/utils";
import { applyCacheControl, createRegistry } from "@/lib/workers/utils/ai";
import { Message } from "@/types/message";
import { Settings } from "@/types/settings";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { convertToModelMessages, generateText, smoothStream, streamText } from "ai";

const PROVIDER_OPTIONS = {
    openai: {
        store: false
    } satisfies OpenAIResponsesProviderOptions,
    google: {
        safetySettings: [
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
            { category: "HARM_CATEGORY_UNSPECIFIED", threshold: "OFF" }
        ]
    } satisfies GoogleGenerativeAIProviderOptions
};

interface ChatRequest {
    messages: Message[];
    settings: Settings;
}

export async function handleChatRequest(request: Request) {
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
        providerOptions: PROVIDER_OPTIONS,
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
                                part.usage.outputTokens! / ((Date.now() - startTimestamp) / 1000)
                        }
                    };
                case "finish":
                    return {
                        totalUsage: {
                            inputTokens: part.totalUsage.inputTokens,
                            inputTokenDetails: part.totalUsage.inputTokenDetails,
                            outputTokens: part.totalUsage.outputTokens,
                            outputTokenDetails: part.totalUsage.outputTokenDetails,
                            totalTokens: part.totalUsage.totalTokens
                        }
                    };
            }
        }
    });
}

export async function handleChatCompletionRequest(request: Request) {
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
        providerOptions: PROVIDER_OPTIONS,
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
