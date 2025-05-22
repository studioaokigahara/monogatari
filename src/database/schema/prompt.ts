import { z } from "zod";
import { NanoID } from "./util";

export const PromptRecord = z.object({
    id: NanoID,
    name: z.string().min(1),
    description: z.string().optional(),
    template: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type PromptRecord = z.infer<typeof PromptRecord>;
