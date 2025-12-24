import { Model } from "../models";

const prices = {
    sonnet: {
        input: 3,
        output: 15,
        cacheRead: 3 * 0.1,
        cacheWrite: 3 * 1.25
    },
    opus: {
        input: 15,
        output: 75,
        cacheRead: 15 * 0.1,
        cacheWrite: 15 * 1.25
    },
    newOpus: {
        input: 5,
        output: 25,
        cacheRead: 5 * 0.1,
        cacheWrite: 5 * 1.25
    }
};

export const AnthropicRegistry: Model<"anthropic">[] = [
    {
        id: "claude-3",
        name: "Claude 3",
        contextLength: 200000,
        maxOutputTokens: 4096,
        checkpoints: [
            {
                id: "claude-3-opus-20240229",
                name: "Claude 3 Opus",
                releaseDate: new Date("02/29/24"),
                price: prices.opus
            },
            {
                id: "claude-3-haiku-20240307",
                name: "Claude 3 Haiku",
                releaseDate: new Date("03/07/24"),
                price: {
                    input: 0.25,
                    output: 1.25,
                    cacheRead: 0.25 * 0.1,
                    cacheWrite: 1.25 * 1.25
                }
            }
        ]
    },
    {
        id: "claude-3-5",
        name: "Claude 3.5",
        contextLength: 200000,
        maxOutputTokens: 4096,
        price: prices.sonnet,
        checkpoints: [
            {
                id: "claude-3-5-sonnet-20241022",
                name: "Claude 3.5 Sonnet V2"
            },
            {
                id: "claude-3-5-sonnet-20240620",
                name: "Claude 3.5 Sonnet"
            },
            {
                id: "claude-3-5-haiku-20241022",
                name: "Claude 3.5 Haiku",
                price: {
                    input: 0.8,
                    output: 1.6,
                    cacheRead: 0.8 * 0.1,
                    cacheWrite: 1.6 * 1.25
                }
            }
        ]
    },
    {
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        releaseDate: new Date("02/19/25"),
        knowledgeCutoff: new Date("Oct 2024"),
        contextLength: 200000,
        maxOutputTokens: 64000,
        price: prices.sonnet,
        supports: {
            reasoning: true
        }
    },
    {
        id: "claude-4",
        name: "Claude 4",
        releaseDate: new Date("05/14/25"),
        knowledgeCutoff: new Date("Jan 2025"),
        contextLength: 200000,
        maxOutputTokens: 64000,
        supports: {
            reasoning: true
        },
        checkpoints: [
            {
                id: "claude-opus-4-1-20250805",
                name: "Claude Opus 4.1",
                releaseDate: new Date("08/05/25"),
                maxOutputTokens: 32000,
                price: prices.opus
            },
            {
                id: "claude-opus-4-20250514",
                name: "Claude Opus 4",
                maxOutputTokens: 32000,
                price: prices.opus
            },
            {
                id: "claude-sonnet-4-20250514",
                name: "Claude Sonnet 4",
                price: prices.sonnet
            }
        ]
    },
    {
        id: "claude-4-5",
        name: "Claude 4.5",
        releaseDate: new Date("09/29/25"),
        knowledgeCutoff: new Date("Jan 2025"),
        contextLength: 200000,
        maxOutputTokens: 64000,
        supports: {
            reasoning: true
        },
        checkpoints: [
            {
                id: "claude-opus-4-5-20251101",
                name: "Claude Opus 4.5",
                releaseDate: new Date("11/24/25"),
                knowledgeCutoff: new Date("Mar 2025"),
                price: prices.newOpus
            },
            {
                id: "claude-sonnet-4-5-20250929",
                name: "Claude Sonnet 4.5",
                contextLength: 1000000,
                price: prices.sonnet
            },
            {
                id: "claude-haiku-4-5-20251001",
                name: "Claude Haiku 4.5",
                releaseDate: new Date("10/01/25"),
                price: {
                    input: 1,
                    output: 5,
                    cacheRead: 1 * 0.1,
                    cacheWrite: 5 * 1.25
                }
            }
        ]
    }
];
