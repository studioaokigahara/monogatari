import { z } from "zod";
import { NanoID } from "./util";

export const PersonaRecord = z.object({
    id: NanoID,
    name: z.string(),
    description: z.string(),
    blob: z.instanceof(Blob),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
});

export type PersonaRecord = z.infer<typeof PersonaRecord>;
