export type Providers = "openai" | "anthropic" | "google" | "deepseek" | "openrouter";

export type Modality = "text" | "image" | "audio" | "video" | "pdf";

export interface Modalities {
    input: Modality[];
    output: Modality[];
}

export interface Price {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
}

export type Capabilities =
    | "streaming"
    | "logProbs"
    | "logitBias"
    | "structuredOutputs"
    | "tools"
    | "reasoning";

export type Supports = {
    [Capability in Capabilities]?: boolean;
};

export interface BaseModel {
    id: string;
    name: string;
    description?: string;

    releaseDate?: Date;
    knowledgeCutoff?: Date;

    contextLength: number;
    maxOutputTokens: number;
    price?: Price;

    modalities?: Modalities;
    supports?: Supports;
}

export type Model = BaseModel & {
    checkpoints?: Partial<BaseModel>[];
};

export type ModelRegistry = {
    [Provider in Providers]: Model[];
};

export type Sampler =
    | "temperature"
    | "topP"
    | "topK"
    | "frequencyPenalty"
    | "presencePenalty"
    | "repetitionPenalty"
    | "minP"
    | "topA";

export type Provider<P extends Providers> = {
    name: string;
    models: ModelRegistry[P];
    modalities: Modalities;
    supports: Supports;
    samplers: Sampler[];
};

export type ProviderRegistry = {
    [P in Providers]: Provider<P>;
};
