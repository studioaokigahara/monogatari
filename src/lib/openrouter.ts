import { Modality, Model } from "@/types/models";
import { OpenRouterModel } from "@/types/registry/openrouter";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import { experimental_createQueryPersister as createQueryPersister } from "@tanstack/react-query-persist-client";

function transformModel(model: OpenRouterModel): Model<"openrouter"> | null {
    if (!model.context_length || model.context_length <= 0) {
        return null;
    }

    const supportsTools =
        model.supported_parameters?.includes("tools") ||
        model.supported_parameters?.includes("tool_choice") ||
        false;
    const supportsReasoning =
        model.supported_parameters?.includes("reasoning") ||
        model.supported_parameters?.includes("include_reasoning");
    const supportsStructuredOutputs =
        model.supported_parameters?.includes("structured_outputs") ||
        model.supported_parameters?.includes("response_format");

    const promptPrice = parseFloat(model.pricing?.prompt || "0");
    const completionPrice = parseFloat(model.pricing?.completion || "0");

    if (model.architecture.input_modalities.includes("file")) {
        const index = model.architecture.input_modalities.indexOf("file");
        model.architecture.input_modalities.splice(index, 1, "pdf");
    }

    if (model.architecture.output_modalities.includes("file")) {
        const index = model.architecture.output_modalities.indexOf("file");
        model.architecture.output_modalities.splice(index, 1, "pdf");
    }

    return {
        id: model.id,
        name: model.name || model.id,
        description: model.description || "",
        contextLength: model.context_length,
        maxOutputTokens: model.top_provider?.max_completion_tokens || 4096,
        price: {
            input: parseFloat(Number(promptPrice * 1_000_000).toFixed(2)),
            output: parseFloat(Number(completionPrice * 1_000_000).toFixed(2))
        },
        modalities: {
            input: model.architecture?.input_modalities as Modality[],
            output: model.architecture?.output_modalities as Modality[]
        },
        supports: {
            streaming: true,
            tools: supportsTools,
            reasoning: supportsReasoning,
            structuredOutputs: supportsStructuredOutputs
        }
    };
}

const persister = createQueryPersister({
    storage: window.localStorage
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 60 * 6,
            // @ts-expect-error react-query and query-core import different types
            persister: persister.persisterFn
        }
    }
});

const openrouterQuery = queryOptions({
    queryKey: ["openrouter", "models"],
    queryFn: async () => {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        return data.data
            .map(transformModel)
            .filter(Boolean)
            .sort((a: Model<"openrouter">, b: Model<"openrouter">) => a.name.localeCompare(b.name));
    }
});

class OpenRouterRegistryManager {
    private static instance: OpenRouterRegistryManager;

    constructor() {
        void queryClient.prefetchQuery(openrouterQuery);
    }

    static getInstance(): OpenRouterRegistryManager {
        if (!OpenRouterRegistryManager.instance) {
            OpenRouterRegistryManager.instance = new OpenRouterRegistryManager();
        }
        return OpenRouterRegistryManager.instance;
    }

    async getModels(): Promise<Model<"openrouter">[]> {
        return await queryClient.ensureQueryData(openrouterQuery);
    }

    getProviderName(modelId: string): string {
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
        return providerMap[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1) || "Other";
    }
}

export const OpenRouterRegistry = OpenRouterRegistryManager.getInstance();
