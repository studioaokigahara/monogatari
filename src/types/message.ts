import { UIMessage, validateUIMessages } from "ai";
import z from "zod";

const LanguageModelUsage = z.object({
    inputTokens: z.number().optional(),
    inputTokenDetails: z
        .object({
            noCacheTokens: z.number().optional(),
            cacheReadTokens: z.number().optional(),
            cacheWriteTokens: z.number().optional()
        })
        .optional(),
    outputTokens: z.number().optional(),
    outputTokenDetails: z
        .object({
            reasoningTokens: z.number().optional(),
            textTokens: z.number().optional()
        })
        .optional(),
    totalTokens: z.number().optional()
});
type LanguageModelUsage = z.infer<typeof LanguageModelUsage>;

const Metadata = z
    .object({
        model: z.string().optional(),
        usage: LanguageModelUsage.extend({
            tokensPerSecond: z.number().optional()
        }).optional(),
        totalUsage: LanguageModelUsage.optional(),
        createdAt: z.coerce.date<string>().optional(),
        updatedAt: z.date().optional()
    })
    .optional();
type Metadata = z.infer<typeof Metadata>;

export const Message = z.custom<UIMessage<Metadata>>((message) => {
    return validateUIMessages({
        messages: [message],
        metadataSchema: Metadata
    });
});
export type Message = UIMessage<Metadata>;
