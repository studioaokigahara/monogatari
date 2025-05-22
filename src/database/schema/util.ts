import { z } from "zod";

export const NanoID = z
    .string()
    .length(16, "must be 16 characters")
    .regex(/^[a-z0-9\-_]{16}$/, "must be Base36");

type NanoID = z.infer<typeof NanoID>;
