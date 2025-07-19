import { z } from "zod";
import { NanoID } from "./util";

export const Prompt = z.object({
    id: NanoID,
    name: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
    enabled: z.boolean().default(true),
    position: z.enum(["before", "after"]).default("before"),
    depth: z.number().int().nonnegative().default(0),
    metadata: z.record(z.any()).optional()
});
export type Prompt = z.infer<typeof Prompt>;

export const PromptSet = z.object({
    id: NanoID,
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    messages: z.array(Prompt)
});
export type PromptSet = z.infer<typeof PromptSet>;
