import z from "zod";

export const CharacterArchiveQuery = z.object({
    query: z.string().default("NOT tags:NTR"),
    page: z.int().default(1),
    count: z
        .int()
        .refine((value) => value % 4 === 0)
        .default(16),
    "sort-key": z.enum(["created", "updated", "added", "downloads"]).optional(),
    "sort-dir": z.enum(["asc", "desc"]).optional(),
    forks: z.boolean().optional(),
    natural: z.boolean().optional(),
    comparison: z.string().optional()
});
export type CharacterArchiveQuery = z.infer<typeof CharacterArchiveQuery>;

export const CharacterArchiveChubInfo = z.object({
    anonymousAuthor: z.string().nullable(),
    fork: z.boolean(),
    fullPath: z.array(z.string())
});
export type CharacterArchiveChubInfo = z.infer<typeof CharacterArchiveChubInfo>;

export const CharacterArchiveItem = z.object({
    author: z.string(),
    chub: CharacterArchiveChubInfo.nullish(),
    created: z.iso.datetime(),
    id: z.string(),
    name: z.string(),
    source: z.enum([
        "chub",
        "booru",
        "nyaime",
        "risuai",
        "webring",
        "char-tavern",
        "generic"
    ]),
    sourceSpecific: z
        .enum(["catbox", "roko", "venusai", "janitorai"])
        .nullable(),
    tagline: z.string(),
    tags: z.array(z.string()),
    type: z.enum(["character", "lorebook"]),
    updated: z.iso.datetime()
});
export type CharacterArchiveItem = z.infer<typeof CharacterArchiveItem>;

const ParsedQueryKey = CharacterArchiveItem.keyof().or(z.literal("freetext"));
type ParsedQueryKey = z.infer<typeof ParsedQueryKey>;

const ParsedQueryValue = z.union([
    z.object({ include: z.string() }),
    z.object({ exclude: z.string() })
]);
type ParsedQueryValue = z.infer<typeof ParsedQueryValue>;

const ParsedQueryTerm = z
    .record(ParsedQueryKey, ParsedQueryValue)
    .refine((parsedQueryTerm) => Object.keys(parsedQueryTerm).length === 1, {
        message: "Each term in parsedQuery should have exactly one key."
    });
type ParsedQueryTerm = z.infer<typeof ParsedQueryTerm>;

export const CharacterArchiveResponse = z.object({
    parsedQuery: z.array(z.array(ParsedQueryTerm)),
    result: z.array(CharacterArchiveItem),
    safety: z.record(z.string(), z.number()),
    searchMethod: z.literal("meilisearch"),
    totalPages: z.number()
});
export type CharacterArchiveResponse = z.infer<typeof CharacterArchiveResponse>;
