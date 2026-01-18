export interface OpenRouterModel {
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
