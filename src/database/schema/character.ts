import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import {
    CharacterBook,
    Lorebook,
    LorebookData
} from "@/database/schema/lorebook";
import { generateCuid2 } from "@/lib/utils";
import { z } from "zod";

// TODO: extract transforms for normalizing chub/sillytavern imports, leave schemas pure

const TavernCard = z.looseObject({
    name: z.string().default(""),
    description: z.string().default(""),
    personality: z.string().default(""),
    scenario: z.string().default(""),
    first_mes: z.string().default(""),
    mes_example: z.string().default("")
});
export type TavernCard = z.infer<typeof TavernCard>;

export const TavernCardV2Data = z.looseObject({
    ...TavernCard.shape,
    creator_notes: z.string(),
    system_prompt: z.string(),
    post_history_instructions: z.string(),
    alternate_greetings: z.array(z.string()),
    character_book: CharacterBook.nullish(),
    tags: z.array(z.string()),
    creator: z.string(),
    character_version: z.string(),
    extensions: z.record(z.string(), z.any()).default({})
});
export type TavernCardV2Data = z.infer<typeof TavernCardV2Data>;

export const TavernCardV2 = z.object({
    spec: z.literal("chara_card_v2"),
    spec_version: z.literal("2.0"),
    data: TavernCardV2Data
});
export type TavernCardV2 = z.infer<typeof TavernCardV2>;

export const CharacterCardV3AssetType = z.union([
    z.enum(["icon", "background", "user_icon", "emotion"]),
    z.string().regex(/^x_[a-z0-9_]+$/, {
        message:
            "Custom asset types must begin with `x_` and contain only lowercase letters, digits or underscores."
    })
]);

export const CharacterCardV3Asset = z
    .object({
        type: CharacterCardV3AssetType,
        uri: z.url({ protocol: /^ccdefault|embeded|embedded$/ }),
        name: z.string().min(1),
        ext: z
            .string()
            .regex(
                /^[a-z0-9]+$|^unknown$/,
                "File extension must be all lowercase without the dot."
            )
    })
    .refine(
        (a) =>
            a.uri === "ccdefault:" ||
            a.uri.endsWith(`.${a.ext}`) ||
            a.ext === "unknown",
        {
            message: "URI must end with the file extension."
        }
    );
export type CharacterCardV3Asset = z.infer<typeof CharacterCardV3Asset>;

export const CharacterCardV3Data = z.looseObject({
    ...TavernCardV2Data.shape,
    character_book: LorebookData.optional(),
    assets: z.array(CharacterCardV3Asset).default([
        {
            type: "icon",
            uri: "ccdefault:",
            name: "main",
            ext: "png"
        }
    ]),
    nickname: z.string().optional(),
    creator_notes_multilingual: z
        .record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), z.string())
        .optional(),
    source: z.array(z.union([z.string(), z.url()])).default([]),
    group_only_greetings: z.array(z.string()).default([]),
    creation_date: z.union([z.date(), z.coerce.date()]).optional(),
    modification_date: z
        .union([
            z.date(),
            z.coerce
                .date()
                .transform((date) => (date < new Date() ? new Date() : date))
        ])
        .optional()
});
export type CharacterCardV3Data = z.infer<typeof CharacterCardV3Data>;

export const CharacterCardV3 = z.object({
    spec: z.literal("chara_card_v3"),
    spec_version: z
        .literal("3.0")
        .refine(
            (version) => parseFloat(version) >= 3.0,
            "spec_version must be a string ≥ 3.0"
        ),
    data: CharacterCardV3Data
});
export type CharacterCardV3 = z.infer<typeof CharacterCardV3>;

const CharacterRecord = z.object({
    id: z.cuid2().default(generateCuid2),
    data: CharacterCardV3Data,
    favorite: z.coerce.number<boolean>().default(0),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});
type CharacterRecord = z.infer<typeof CharacterRecord>;

export class Character implements CharacterRecord {
    id: string;
    data: CharacterCardV3Data;
    favorite: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Character>) {
        const record = CharacterRecord.parse(data);
        this.id = record.id;
        this.data = record.data;
        this.favorite = record.favorite;
        this.createdAt = record.createdAt;
        this.updatedAt = record.updatedAt;
    }

    async save() {
        const record = CharacterRecord.parse(this);
        Object.assign(this, record);
        await db.transaction("rw", [db.characters, db.lorebooks], async () => {
            await db.characters.put(this);
            const lorebook = await db.lorebooks.get({
                embeddedCharacterID: this.id
            });
            if (
                !lorebook &&
                this.data.character_book &&
                this.data.character_book.entries.length > 0
            ) {
                const newLorebook = await Lorebook.import(
                    this.data.character_book
                );
                newLorebook.data.name = this.data.name;
                newLorebook.embeddedCharacterID = this.id;
                await newLorebook.save();
            }
        });
    }

    static async load(id: string) {
        const character = await db.characters.get(id);
        if (!character) {
            throw new Error(`Unable to load character ${id}: id invalid.`);
        }
        return character;
    }

    async update(data: Partial<Character["data"]>) {
        const record = CharacterRecord.parse({
            ...this,
            data: { ...this.data, ...data }
        });
        record.updatedAt = new Date();
        record.data.modification_date = new Date();
        Object.assign(this, record);
        await db.characters.put(this);
    }

    async toggleFavorite() {
        this.favorite = Number(!this.favorite);
        this.updatedAt = new Date();
        await db.characters.put(this);
    }

    async replaceAsset(assetName: string, file: File) {
        const ext = file.name.split(".").pop() ?? file.type.split("/")[1];
        await db.transaction("rw", [db.characters, db.assets], async () => {
            const updatedAssets = this.data.assets.map((pointer) =>
                pointer.name === assetName
                    ? {
                          ...pointer,
                          uri:
                              pointer.uri === "ccdefault:"
                                  ? pointer.uri
                                  : `embedded://${pointer.name}.${ext}`
                      }
                    : pointer
            );
            await this.update({ assets: updatedAssets });
            const asset = await Asset.load(this.id, assetName);
            if (asset) {
                await asset.update({
                    file: new File([file], `${assetName}.${ext}`, {
                        type: file.type
                    })
                });
            }
        });
    }

    async delete() {
        await db.transaction(
            "rw",
            [db.characters, db.lorebooks, db.assets],
            async () => {
                await db.characters.delete(this.id);
                await db.lorebooks
                    .where("embeddedCharacterID")
                    .equals(this.id)
                    .delete();
                await db.lorebooks
                    .where("linkedCharacterIDs")
                    .anyOf([this.id])
                    .modify((lorebook) => {
                        lorebook.linkedCharacterIDs =
                            lorebook.linkedCharacterIDs.filter(
                                (id) => id !== this.id
                            );
                    });
                await db.assets.where("parentID").equals(this.id).delete();
            }
        );
    }
}
