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
    projectSpace: z.enum([
        "characters",
        "lorebooks",
        "presets",
        "extensions",
        "people",
        "tags"
    ]),
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

export enum ButtonState {
    READY_DOWNLOAD = "ready_download",
    READY_UPDATE = "ready_update",
    IN_QUEUE = "in_queue",
    DOWNLOADING = "downloading",
    DONE = "done",
    ERROR = "error"
}

export interface SearchOptions {
    searchTerm: string;
    creator: string;
    namespace: string;
    includedTags: string[];
    excludedTags: string[];
    nsfw: boolean;
    itemsPerPage: number;
    sort: string;
    sortAscending: boolean;
    page: number;
    inclusiveOr: boolean;
}
