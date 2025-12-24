import { Model } from "../models";

export const OpenAIRegistry: Model<"openai">[] = [
    {
        id: "gpt-3.5-turbo",
        name: "GPT‑3.5 Turbo",
        contextLength: 16384,
        maxOutputTokens: 4096,
        supports: {
            streaming: true,
            structuredOutputs: false,
            tools: true,
            reasoning: false,
            logProbs: true
        },
        checkpoints: [
            {
                id: "gpt-3.5-turbo-0125"
            },
            {
                id: "gpt-3.5-turbo-1106"
            },
            {
                id: "gpt-3.5-turbo-instruct"
            }
        ]
    },
    {
        id: "gpt-4",
        name: "GPT‑4",
        contextLength: 8192,
        maxOutputTokens: 8192,
        supports: {
            streaming: true,
            structuredOutputs: false,
            tools: false,
            reasoning: false,
            logProbs: true
        },
        checkpoints: [
            {
                id: "gpt-4-0613"
            },
            {
                id: "gpt-4-0314"
            }
        ]
    },
    {
        id: "gpt-4-turbo",
        name: "GPT‑4 Turbo",
        contextLength: 128000,
        maxOutputTokens: 4096,
        supports: {
            streaming: true,
            structuredOutputs: false,
            tools: false,
            reasoning: false,
            logProbs: true
        },
        checkpoints: [
            {
                id: "gpt-4-turbo-2024-04-09",
                modalities: {
                    input: ["text", "image"],
                    output: ["text"]
                },
                supports: { tools: true }
            },
            {
                id: "gpt-4-0125-preview"
            },
            {
                id: "gpt-4-1106-preview"
            },
            {
                id: "gpt-4-1106-vision-preview",
                modalities: {
                    input: ["text", "image"],
                    output: ["text"]
                }
            }
        ]
    },
    {
        id: "gpt-4o",
        name: "GPT‑4o",
        contextLength: 128000,
        maxOutputTokens: 16384,
        supports: {
            streaming: true,
            structuredOutputs: true,
            tools: true,
            reasoning: false,
            logProbs: true
        },
        checkpoints: [
            {
                id: "chatgpt-4o-latest",
                name: "ChatGPT-4o",
                description:
                    "ChatGPT-4o points to the GPT-4o snapshot currently used in ChatGPT.",
                price: {
                    input: 5,
                    output: 15
                },
                contextLength: 128000,
                maxOutputTokens: 16384,
                supports: {
                    structuredOutputs: false
                }
            },
            {
                id: "gpt-4o-2024-11-20"
            },
            {
                id: "gpt-4o-2024-08-06"
            },
            {
                id: "gpt-4o-mini-2024-07-18",
                name: "GPT‑4o mini",
                maxOutputTokens: 4096
            },
            {
                id: "gpt-4o-2024-05-13"
            }
        ]
    },
    {
        id: "gpt-4.1",
        name: "GPT-4.1",
        contextLength: 1047576,
        maxOutputTokens: 32768,
        supports: {
            streaming: true,
            structuredOutputs: true,
            tools: true,
            reasoning: false,
            logProbs: true
        },
        checkpoints: [
            {
                id: "gpt-4.1-2025-04-14",
                name: "GPT-4.1",
                price: {
                    input: 2,
                    output: 8
                }
            },
            {
                id: "gpt-4.1-mini-2025-04-14",
                name: "GPT-4.1 mini",
                price: {
                    input: 0.4,
                    output: 1.6
                }
            },
            {
                id: "gpt-4.1-nano-2025-04-14",
                name: "GPT-4.1 nano",
                price: {
                    input: 0.1,
                    output: 0.4
                }
            }
        ]
    },
    {
        id: "gpt-5",
        name: "GPT-5",
        releaseDate: new Date("08/07/25"),
        knowledgeCutoff: new Date("09/30/24"),
        contextLength: 400000,
        maxOutputTokens: 128000,
        modalities: {
            input: ["text", "image"],
            output: ["text"]
        },
        checkpoints: [
            {
                id: "gpt-5-2025-08-07",
                price: {
                    input: 1.25,
                    output: 10,
                    cacheRead: 0.125
                }
            },
            {
                id: "gpt-5-chat-latest",
                name: "GPT-5 Chat",
                description:
                    "GPT-5 Chat points to the GPT-5 snapshot currently used in ChatGPT.",
                price: {
                    input: 1.25,
                    output: 10,
                    cacheRead: 0.125
                }
            },
            {
                id: "gpt-5-mini-2025-08-07",
                name: "GPT-5 mini",
                knowledgeCutoff: new Date("05/31/24"),
                price: {
                    input: 0.25,
                    output: 2,
                    cacheRead: 0.025
                }
            },
            {
                id: "gpt-5-nano-2025-08-07",
                name: "GPT-5 nano",
                knowledgeCutoff: new Date("05/31/24"),
                price: {
                    input: 0.05,
                    output: 0.4,
                    cacheRead: 0.005
                }
            }
        ]
    },
    {
        id: "gpt-5.1",
        name: "GPT-5.1",
        releaseDate: new Date("11/13/25"),
        knowledgeCutoff: new Date("09/30/24"),
        contextLength: 400000,
        maxOutputTokens: 128000,
        modalities: {
            input: ["text", "image"],
            output: ["text"]
        },
        price: {
            input: 1.25,
            output: 10,
            cacheRead: 0.125
        },
        checkpoints: [
            {
                id: "gpt-5.1-2025-11-13"
            },
            {
                id: "gpt-5.1-chat-latest",
                name: "GPT-5.1 Chat",
                description:
                    "GPT-5.1 Chat points to the GPT-5.1 snapshot currently used in ChatGPT."
            }
        ]
    },
    {
        id: "gpt-5.2",
        name: "GPT-5.2",
        releaseDate: new Date("12/11/25"),
        knowledgeCutoff: new Date("09/31/24"),
        contextLength: 400000,
        maxOutputTokens: 128000,
        modalities: {
            input: ["text", "image"],
            output: ["text"]
        },
        price: {
            input: 1.75,
            output: 14,
            cacheRead: 0.175
        },
        checkpoints: [
            {
                id: "gpt-5.2-pro-2025-12-11",
                name: "GPT-5.2 Pro",
                description:
                    "Version of GPT-5.2 that produces smarter and more precise responses. Since GPT-5.2 Pro is designed to tackle tough problems, some requests may take several minutes to finish.",
                price: {
                    input: 21,
                    output: 168
                }
            },
            {
                id: "gpt-5.2-2025-12-11"
            },
            {
                id: "gpt-5.2-chat-latest",
                name: "GPT-5.2 Chat",
                description:
                    "GPT-5.2 Chat points to the GPT-5.2 snapshot currently used in ChatGPT."
            }
        ]
    }
];
