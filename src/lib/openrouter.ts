import { Modality, Model } from "@/types/models";

interface OpenRouterModel {
    id: string;
    name: string;
    created: number;
    description: string;
    architecture: {
        input_modalities: string[];
        output_modalities: string[];
        tokenizer: string;
        instruct_type: string;
    };
    top_provider: {
        is_moderated: boolean;
        context_length: number;
        max_completion_tokens: number;
    };
    pricing: {
        prompt: string;
        completion: string;
        image: string;
        request: string;
        web_search: string;
        internal_reasoning: string;
        input_cache_read: string;
        input_cache_write: string;
    };
    canonical_slug: string;
    context_length: number;
    hugging_face_id: string;
    per_request_limits: Record<string, any>;
    supported_parameters: string[];
}

class OpenRouterRegistryManager {
    private static instance: OpenRouterRegistryManager;
    private models: Model<"openrouter">[] = [];
    private loading = false;
    private lastFetch = 0;
    private readonly CACHE_DURATION = 1000 * 60 * 60 * 6;
    private readonly CACHE_KEY = "openrouter-registry-models";

    static getInstance(): OpenRouterRegistryManager {
        if (!OpenRouterRegistryManager.instance) {
            OpenRouterRegistryManager.instance =
                new OpenRouterRegistryManager();
        }
        return OpenRouterRegistryManager.instance;
    }

    constructor() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) {
                this.ensureModelsLoaded();
                return;
            }

            const cacheData = JSON.parse(cached);
            const { cachedModels, timestamp } = cacheData;

            if (Array.isArray(cachedModels) && cachedModels.length > 0) {
                this.models.splice(0, this.models.length, ...cachedModels);
                this.lastFetch = timestamp ?? Date.now();
            }
        } catch (error) {
            console.error("Failed to load models from cache:", error);
            localStorage.removeItem(this.CACHE_KEY);
        }
        this.ensureModelsLoaded();
    }

    private saveToCache(): void {
        try {
            const cacheData = {
                models: this.models,
                timestamp: this.lastFetch
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error("Failed to save models to cache:", error);
        }
    }

    async ensureModelsLoaded(): Promise<void> {
        const now = Date.now();
        const cacheValid = now - this.lastFetch > this.CACHE_DURATION;

        if (!cacheValid || this.loading) this.loading = true;
        try {
            const models = await this.fetchModels();
            const currentModels = JSON.stringify(this.models);
            const newModels = JSON.stringify(models);

            if (newModels !== currentModels) {
                this.models.splice(0, this.models.length, ...models);
            }

            this.lastFetch = now;
            this.saveToCache();
        } catch (error) {
            console.error("Failed to load OpenRouter models:", error);
        } finally {
            this.loading = false;
        }
    }

    private async fetchModels() {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.data
            .map(this.transformModel)
            .filter(Boolean)
            .sort((a: Model<"openrouter">, b: Model<"openrouter">) =>
                a.name.localeCompare(b.name)
            );
    }

    private transformModel(
        apiModel: OpenRouterModel
    ): Model<"openrouter"> | null {
        try {
            if (!apiModel.context_length || apiModel.context_length <= 0) {
                return null;
            }

            const supportsTools =
                apiModel.supported_parameters?.includes("tools") ||
                apiModel.supported_parameters?.includes("tool_choice") ||
                false;
            const supportsReasoning =
                apiModel.supported_parameters?.includes("reasoning") ||
                apiModel.supported_parameters?.includes("include_reasoning");
            const supportsStructuredOutputs =
                apiModel.supported_parameters?.includes("structured_outputs") ||
                apiModel.supported_parameters?.includes("response_format");

            const promptPrice = parseFloat(apiModel.pricing?.prompt || "0");
            const completionPrice = parseFloat(
                apiModel.pricing?.completion || "0"
            );

            if (apiModel.architecture.input_modalities.includes("file")) {
                const index =
                    apiModel.architecture.input_modalities.indexOf("file");
                apiModel.architecture.input_modalities.splice(index, 1, "pdf");
            }

            if (apiModel.architecture.output_modalities.includes("file")) {
                const index =
                    apiModel.architecture.output_modalities.indexOf("file");
                apiModel.architecture.output_modalities.splice(index, 1, "pdf");
            }

            return {
                id: apiModel.id,
                name: apiModel.name || apiModel.id,
                description: apiModel.description || "",
                contextLength: apiModel.context_length,
                maxOutputTokens:
                    apiModel.top_provider?.max_completion_tokens || 4096,
                price: {
                    input: parseFloat(
                        Number(promptPrice * 1_000_000).toFixed(2)
                    ),
                    output: parseFloat(
                        Number(completionPrice * 1_000_000).toFixed(2)
                    )
                },
                modalities: {
                    input: apiModel.architecture
                        ?.input_modalities as Modality[],
                    output: apiModel.architecture
                        ?.output_modalities as Modality[]
                },
                supports: {
                    streaming: true,
                    tools: supportsTools,
                    reasoning: supportsReasoning,
                    structuredOutputs: supportsStructuredOutputs
                }
            };
        } catch (error) {
            console.error("Error transforming model:", apiModel?.id, error);
            return null;
        }
    }

    getModels() {
        return this.models;
    }

    async refreshModels(): Promise<void> {
        return this.ensureModelsLoaded();
    }

    isLoading(): boolean {
        return this.loading;
    }
}

export const OpenRouterRegistry = OpenRouterRegistryManager.getInstance();

export function getProviderName(modelId: string): string {
    const providerMap: Record<string, string> = {
        "agentica-org": "Agentica",
        ai21: "AI21",
        "aion-labs": "Aion Labs",
        alfredpros: "AlfredPros",
        "anthracite-org": "Anthracite",
        "arcee-ai": "Arcee AI",
        arliai: "Arli AI",
        bytedance: "ByteDance",
        cognitivecomputations: "Cognitive Computations",
        deepcogito: "Deep Cogito",
        deepseek: "DeepSeek",
        eleutherai: "EleutherAI",
        "meta-llama": "Meta",
        minimax: "MiniMax",
        mistralai: "Mistral",
        moonshotai: "Moonshot AI",
        neversleep: "NeverSleep",
        nousresearch: "Nous",
        nvidia: "NVIDIA",
        openai: "OpenAI",
        openrouter: "OpenRouter",
        pygmalionai: "Pygmalion",
        raifle: "rAIfle",
        rekaai: "Reka",
        sao10k: "Sao10K",
        "shisa-ai": "Shisa AI",
        "stepfun-ai": "StepFun",
        sophosympatheia: "sophosympatheia",
        thedrummer: "TheDrummer",
        thudm: "THUDM",
        tngtech: "TNG",
        "x-ai": "xAI",
        "z-ai": "Z.AI"
    };

    const prefix = modelId.split("/")[0] || "";
    return (
        providerMap[prefix] ||
        prefix.charAt(0).toUpperCase() + prefix.slice(1) ||
        "Other"
    );
}
