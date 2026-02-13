import { ModelRegistry } from "@/types/models";

export const GoogleRegistry: ModelRegistry["google"] = [
    {
        id: "gemini-2.0",
        name: "Gemini 2.0",
        contextLength: 1_048_576,
        maxOutputTokens: 8192,
        supports: {
            streaming: true,
            tools: true,
            reasoning: false
        },
        checkpoints: [
            {
                id: "gemini-2.0-flash",
                name: "Gemini 2.0 Flash"
            },
            // {
            //     id: "gemini-2.0-flash-preview-image-generation",
            //     name: "Gemini 2.0 Flash (Image Generation Preview)",
            // },
            {
                id: "gemini-2.0-flash-lite",
                name: "Gemini 2.0 Flash-Lite"
            }
            // {
            //     id: "gemini-2.0-flash-live-001",
            //     name: "Gemini 2.0 Flash Live",
            // },
        ]
    },
    {
        id: "gemini-2.5",
        name: "Gemini 2.5",
        releaseDate: new Date("June 2025"),
        knowledgeCutoff: new Date("January 2025"),
        contextLength: 1_048_576,
        maxOutputTokens: 65_536,
        supports: {
            streaming: true,
            tools: true,
            reasoning: true
        },
        checkpoints: [
            {
                id: "gemini-2.5-pro",
                name: "Gemini 2.5 Pro"
            },
            {
                id: "gemini-2.5-flash",
                name: "Gemini 2.5 Flash"
            },
            {
                id: "gemini-2.5-flash-image",
                name: "Nano Banana",
                releaseDate: new Date("October 2025"),
                modalities: {
                    input: ["text", "image"],
                    output: ["text", "image"]
                }
            }
        ]
    },
    {
        id: "gemini-3-pro-preview",
        name: "Gemini 3",
        releaseDate: new Date("11/18/25"),
        knowledgeCutoff: new Date("January 2025"),
        contextLength: 1_048_576,
        maxOutputTokens: 65_536,
        supports: {
            streaming: true,
            structuredOutputs: true,
            tools: true,
            reasoning: true
        }
    }
];
