import z from "zod";

const ChubPermissions = z.enum(["read"]);

export const ChubCharacter = z.object({
    id: z.int().nonnegative(),
    name: z.string(),
    fullPath: z.string(),
    description: z.string(),
    starCount: z.int().nonnegative(),
    lastActivityAt: z.date(),
    createdAt: z.date(),
    labels: z.array(
        z.object({
            title: z.string(),
            description: z.string()
        })
    ),
    topics: z.array(z.string()),
    forksCount: z.int().nonnegative(),
    rating: z.number().nonnegative(),
    ratingCount: z.int().nonnegative(),
    projectSpace: z.enum(["characters", "lorebooks", "presets", "extensions", "people", "tags"]),
    creatorId: z.int().nonnegative().nullable(),
    nTokens: z.int().nonnegative(),
    tagline: z.string(),
    primaryFormat: z.enum(["card_spec_v2"]),
    related_characters: z.array(z.unknown()),
    related_lorebooks: z.array(z.unknown()),
    related_prompts: z.array(z.unknown()),
    related_extensions: z.array(z.unknown()),
    hasGallery: z.boolean(),
    nChats: z.int().nonnegative(),
    nMessages: z.int().nonnegative(),
    definition: z.unknown().nullable(),
    permissions: ChubPermissions,
    is_public: z.boolean(),
    is_favorite: z.boolean(),
    nsfw_image: z.boolean(),
    n_public_chats: z.int().nonnegative(),
    n_favorites: z.int().nonnegative(),
    is_unlisted: z.boolean(),
    avatar_url: z.url(),
    max_res_url: z.url(),
    bound_preset: z.unknown().nullable(),
    project_uuid: z.string().nullable(),
    voice_id: z.string().nullable(),
    verified: z.boolean(),
    recommended: z.boolean(),
    ratings_disabled: z.boolean(),
    lang_id: z.int().nonnegative(),
    badges: z.array(z.unknown())
});
export type ChubCharacter = z.infer<typeof ChubCharacter>;

export const ChubResponse = z.object({
    data: z.object({
        count: z.int().positive(),
        cursor: z.string(),
        nodes: z.array(ChubCharacter),
        page: z.int().positive(),
        previous_cursor: z.string().nullable()
    })
});
export type ChubResponse = z.infer<typeof ChubResponse>;

export const ChubCharacterResponse = z.object({
    errors: z.unknown().nullable(),
    node: ChubCharacter,
    permissions: ChubPermissions,
    is_favorite: z.boolean()
});
export type ChubCharacterResponse = z.infer<typeof ChubCharacterResponse>;

const ChubGalleryImage = z.object({
    generation_uuid: z.uuid().nullable(),
    cost: z.number().nullable(),
    queue_length: z.number().nullable(),
    primary_character_id: z.number(),
    secondary_character_ids: z.array(z.number()),
    lorebook_id: z.number().nullable(),
    primary_image_path: z.url(),
    user_owned: z.boolean(),
    nsfw_image: z.boolean(),
    description: z.string(),
    prompt: z.record(z.string(), z.number()),
    is_published: z.boolean(),
    comments_enabled: z.boolean(),
    is_done: z.boolean(),
    is_failed: z.boolean(),
    parent_image: z.number().nullable(),
    item_id: z.number().nullable(),
    uuid: z.uuid(),
    info: z.string().nullable(),
    name: z.string().nullable(),
    preview: z.unknown().nullable()
});
type ChubGalleryImage = z.infer<typeof ChubGalleryImage>;

export const ChubGalleryResponse = z.object({
    count: z.number(),
    nodes: z.array(ChubGalleryImage),
    page: z.number()
});
export type ChubGalleryResponse = z.infer<typeof ChubGalleryResponse>;

export const SearchOptions = z.object({
    searchTerm: z.string().default(""),
    creator: z.string().default(""),
    namespace: z.enum(["characters", "lorebooks"]).default("characters"),
    includedTags: z.string().default(""),
    excludedTags: z.string().default("ntr"),
    nsfw: z.stringbool().default(true),
    itemsPerPage: z.coerce.number().default(24),
    sort: z
        .enum([
            "trending_downloads",
            "download_count",
            "star_count",
            "rating",
            "rating_count",
            "last_activity_at",
            "n_favorites",
            "created_at",
            "name",
            "n_tokens",
            "newcomer",
            "random"
        ])
        .default("trending_downloads"),
    sortAscending: z.preprocess((value: string) => value === "asc", z.boolean()).default(false),
    page: z.number().default(1),
    inclusiveOr: z.stringbool().default(false)
});
export type SearchOptions = z.infer<typeof SearchOptions>;
