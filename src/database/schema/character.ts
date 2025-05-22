import { CharacterBook, Lorebook } from "@/database/schema/lorebook";
import { NanoID } from "@/database/schema/util";
import { z } from "zod";

const TavernCard = z
    .object({
        name: z.string().default(""),
        description: z.string().default(""),
        personality: z.string().default(""),
        scenario: z.string().default(""),
        first_mes: z.string().default(""),
        mes_example: z.string().default(""),
    })
    .catchall(z.any());

export type TavernCard = z.infer<typeof TavernCard>;

export const TavernCardV2Data = TavernCard.extend({
    creator_notes: z.string(),
    system_prompt: z.string(),
    post_history_instructions: z.string(),
    alternate_greetings: z.array(z.string().min(1)),
    character_book: CharacterBook.optional(),
    tags: z.array(z.string()),
    creator: z.string().min(1),
    character_version: z.string(),
    extensions: z.record(z.any()).default({}),
}).catchall(z.any());

export const TavernCardV2 = z
    .object({
        spec: z.literal("chara_card_v2"),
        spec_version: z.literal("2.0"),
        data: TavernCardV2Data,
    })
    .passthrough();

export type TavernCardV2 = z.infer<typeof TavernCardV2>;

export const CharacterCardV3AssetType = z.union([
    z.enum(["icon", "background", "user_icon", "emotion"]),
    z.string().regex(/^x_[a-z0-9_]+$/, {
        message:
            "Custom asset types must begin with `x_` and contain only lowercase letters, digits or underscores.",
    }),
]);

export const CharacterCardV3Asset = z
    .object({
        type: CharacterCardV3AssetType,
        uri: z
            .string()
            .url()
            .or(
                z
                    .string()
                    .regex(
                        /^ccdefault:\/\/|^embedded:\/\//,
                        "URI must begin with `ccdefault://` or `embedded://`",
                    ),
            ),
        name: z.string().min(1),
        ext: z
            .string()
            .regex(
                /^[a-z0-9]+$/,
                "File extension must be all lowercase without the dot.",
            ),
    })
    .refine((a) => a.ext === "unknown" || a.uri.endsWith(`.${a.ext}`), {
        message: "URI must end with the file extension.",
    });

export type CharacterCardV3Asset = z.infer<typeof CharacterCardV3Asset>;

export const CharacterCardV3Data = TavernCardV2Data.extend({
    // changed fields from CCV2
    creator_notes: z.string(),
    character_book: Lorebook.optional(),
    // new fields in CCV3
    assets: z.array(CharacterCardV3Asset).default([
        {
            type: "icon",
            uri: "ccdefault://",
            name: "main",
            ext: "unknown",
        },
    ]),
    nickname: z.string().min(1).optional(),
    creator_notes_multilingual: z
        .record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), z.string())
        .optional(),
    source: z.array(z.string().url()).default([]),
    group_only_greetings: z.array(z.string()).default([]),
    creation_date: z.date().optional(),
    modification_date: z.date().optional(),
}).catchall(z.any());

export const CharacterCardV3 = z
    .object({
        spec: z.literal("chara_card_v3"),
        spec_version: z
            .string()
            .refine(
                (s) =>
                    !isNaN(Number.parseFloat(s)) && Number.parseFloat(s) >= 3.0,
                "Spec version must be a string version ≥ 3.0",
            ),
        data: CharacterCardV3Data.transform((data) => {
            const specKeys = new Set(Object.keys(CharacterCardV3Data.shape));
            const extraEntries = Object.entries(data).filter(
                ([key]) => !specKeys.has(key),
            );
            const extras = Object.fromEntries(extraEntries);

            for (const [k] of extraEntries) {
                delete (data as any)[k];
            }

            return {
                ...data,
                extensions: {
                    ...data.extensions,
                    ...extras,
                },
            };
        }),
    })
    .strip();

export type CharacterCardV3 = z.infer<typeof CharacterCardV3>;

export const AssetRecord = z.object({
    blob: z.instanceof(Blob),
    type: CharacterCardV3AssetType,
    name: z.string(),
    ext: z.string(),
});

export type AssetRecord = z.infer<typeof AssetRecord>;

export const CharacterRecord = z.object({
    id: NanoID,
    data: CharacterCardV3Data,
    assets: z.array(AssetRecord),
    tagline: z.string(),
    favorite: z.boolean(),
});

export type CharacterRecord = z.infer<typeof CharacterRecord>;
