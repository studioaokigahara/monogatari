export type Providers =
    | "xai"
    | "openai"
    | "azure"
    | "anthropic"
    | "amazon-bedrock"
    | "google"
    | "google-vertex"
    | "mistral"
    | "togetherai"
    | "cohere"
    | "fireworks"
    | "deepinfra"
    | "deepseek"
    | "cerebras"
    | "groq"
    | "perplexity"
    | "elevenlabs"
    | "lmnt"
    | "hume"
    | "revai"
    | "deepgram"
    | "gladia";

export interface BaseModel {
    id: string;
    name: string;
    description?: string;
    price?: {
        input: number;
        output: number;
    };
    contextLength: number;
    maxOutputTokens: number;
    supports: {
        streaming: boolean;
        imageInput: boolean;
        tools: boolean;
        reasoning: boolean;
    };
}

export interface OpenAISupports {
    structuredOutput: boolean;
    logprobs: boolean;
}

type ProviderSupports = {
    [P in Providers]: {};
} & {
    openai: OpenAISupports;
};

export interface Checkpoint {
    id: string;
    name?: string;
    description?: string;
    price?: {
        input: number;
        output: number;
    };
    contextLength?: number;
    maxOutputTokens?: number;
    supports?: Partial<
        BaseModel["supports"] & ProviderSupports[keyof ProviderSupports]
    >;
}

type Expand<T> = { [K in keyof T]: T[K] };

export type Model<P extends Providers> = Omit<BaseModel, "supports"> & {
    supports: Expand<BaseModel["supports"] & ProviderSupports[P]>;
    checkpoints?: Checkpoint[];
};

export type ModelRegistry = {
    [P in Providers]: Model<P>[];
};

export type Provider<P extends Providers> = {
    name: string;
    models: ModelRegistry[P];
};

export type ProviderRegistry = {
    [P in Providers]: Provider<P>;
};
