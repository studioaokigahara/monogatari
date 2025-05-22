import { z } from "zod";

const CharacterBookEntry = z
    .object({
        keys: z.array(z.string()),
        content: z.string(),
        extensions: z.record(z.string(), z.any()).default({}),
        enabled: z.boolean().default(true),
        insertion_order: z.number().min(0).default(0),
        case_sensitive: z.boolean().default(false).optional(),
        name: z.string().optional(),
        priority: z.number().optional(),
        id: z.number().optional(),
        comment: z.string().optional(),
        selective: z.boolean().optional(),
        secondary_keys: z.array(z.string()).optional(),
        constant: z.boolean().optional(),
        position: z.preprocess((val) => {
            if (val === "" || val == null) return undefined;
            if (Number(val) == 0) return "before_char";
            if (Number(val) == 1) return "after_char";
            return undefined;
        }, z.enum(["before_char", "after_char"]).optional()),
    })
    .passthrough();

export const CharacterBook = z
    .object({
        name: z.string().optional(),
        description: z.string().optional(),
        scan_depth: z.number().min(0).optional(),
        token_budget: z.number().min(0).optional(),
        recursive_scanning: z.boolean().optional(),
        extensions: z.record(z.string(), z.any()),
        entries: z.array(CharacterBookEntry),
    })
    .transform((book) => {
        return {
            ...book,
            entries: book.entries.map((entry): any => {
                const {
                    probability,
                    selectiveLogic,
                    extensions,
                    keys,
                    secondary_keys,
                    _selective,
                    ...rest
                } = entry as any;

                const chub = { ...extensions.chub } as Record<string, any>;
                if (typeof probability === "number")
                    chub.probability = probability;
                if (typeof selectiveLogic !== "undefined")
                    chub.selectiveLogic = selectiveLogic;

                const realSecondary =
                    Array.isArray(secondary_keys) && secondary_keys.length
                        ? secondary_keys.filter((key) => key && key.length)
                        : undefined;

                const realSelective = realSecondary ? true : false;

                return {
                    ...rest,
                    keys: Array.isArray(keys)
                        ? keys.filter((key) => !!key)
                        : [],
                    content: entry.content ?? "",
                    selective: realSelective,
                    secondary_keys: realSecondary,
                    extensions: {
                        ...extensions,
                        chub,
                    },
                };
            }),
        };
    });

const LorebookEntry = z
    .object({
        keys: z.array(z.string()),
        content: z.string(),
        extensions: z.record(z.string(), z.any()).default({}),
        enabled: z.boolean(),
        insertion_order: z.number().int().nonnegative(),
        case_sensitive: z.boolean().optional(),
        use_regex: z.boolean().default(false),
        constant: z.boolean().optional(),
        // Optional metadata:
        name: z.string().optional(),
        priority: z.number().int().nonnegative().optional(),
        id: z.union([z.number().int(), z.string()]).optional(),
        comment: z.string().optional(),
        position: z.preprocess((val) => {
            if (val === "" || val == null) return undefined;
            if (Number(val) == 0) return "before_char";
            if (Number(val) == 1) return "after_char";
            return undefined;
        }, z.enum(["before_char", "after_char"]).optional()),
    })
    .passthrough();

export const Lorebook = z
    .object({
        name: z.string().optional(),
        description: z.string().optional(),
        scan_depth: z.number().int().nonnegative().optional(),
        token_budget: z.number().int().nonnegative().optional(),
        recursive_scanning: z.boolean().optional(),
        extensions: z.record(z.string(), z.any()).default({}),
        entries: z.array(LorebookEntry),
    })
    .transform((book) => {
        return {
            ...book,
            entries: book.entries.map((entry): any => {
                const {
                    probability,
                    selectiveLogic,
                    extensions,
                    keys,
                    secondary_keys,
                    _selective,
                    ...rest
                } = entry as any;

                const chub = { ...extensions.chub } as Record<string, any>;
                if (typeof probability === "number")
                    chub.probability = probability;
                if (typeof selectiveLogic !== "undefined")
                    chub.selectiveLogic = selectiveLogic;

                const realSecondary =
                    Array.isArray(secondary_keys) && secondary_keys.length
                        ? secondary_keys.filter((key) => key && key.length)
                        : undefined;

                const realSelective = realSecondary ? true : false;

                return {
                    ...rest,
                    keys: Array.isArray(keys)
                        ? keys.filter((key) => !!key)
                        : [],
                    content: entry.content ?? "",
                    selective: realSelective,
                    secondary_keys: realSecondary,
                    extensions: {
                        ...extensions,
                        chub,
                    },
                };
            }),
        };
    });
