import { Model } from "../models";

export const DeepSeekRegistry: Model<"deepseek">[] = [
    {
        id: "deepseek-v3.2",
        name: "DeepSeek-V3.2",
        contextLength: 128000,
        maxOutputTokens: 8192,
        price: {
            input: 0.28,
            output: 0.42,
            cacheRead: 0.028
        },
        supports: {
            streaming: true
        },
        checkpoints: [
            {
                id: "deepseek-chat",
                supports: {
                    tools: true
                }
            },
            {
                id: "deepseek-reasoner",
                name: "DeepSeek-V3.2 (Thinking)",
                maxOutputTokens: 65536,
                supports: {
                    reasoning: true
                }
            }
        ]
    }
];
