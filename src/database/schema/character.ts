import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import { CharacterBook, Lorebook, LorebookData } from "@/database/schema/lorebook";
import { generateCuid2, getFileExtension } from "@/lib/utils";
import { z } from "zod";

const TavernCard = z.object({
    name: z.string(),
    description: z.string(),
    personality: z.string(),
    scenario: z.string(),
    first_mes: z.string(),
    mes_example: z.string()
});
export type TavernCard = z.infer<typeof TavernCard>;

export const TavernCardV2Data = z.object({
    ...TavernCard.shape,
    creator_notes: z.string(),
    system_prompt: z.string(),
    post_history_instructions: z.string(),
    alternate_greetings: z.array(z.string()),
    character_book: CharacterBook.optional(),
    tags: z.array(z.string()),
    creator: z.string(),
    character_version: z.string(),
    extensions: z.record(z.string(), z.any())
});
export type TavernCardV2Data = z.infer<typeof TavernCardV2Data>;

export const TavernCardV2 = z.object({
    spec: z.literal("chara_card_v2"),
    spec_version: z.literal("2.0"),
    data: TavernCardV2Data
});
export type TavernCardV2 = z.infer<typeof TavernCardV2>;

const CharacterCardV3AssetType = z.union([
    z.enum(["icon", "background", "user_icon", "emotion"]),
    z
        .string()
        .regex(
            /^x_[a-z0-9_]+$/,
            "Custom asset types must begin with `x_` and contain only lowercase letters, digits, or underscores."
        )
]);

export const CharacterCardV3Asset = z
    .object({
        type: CharacterCardV3AssetType,
        uri: z.url({ protocol: /^ccdefault|embeded|embedded$/ }),
        name: z.string().min(1),
        ext: z.union([z.literal("unknown"), z.string().toLowerCase()])
    })
    .refine(
        (asset) => {
            return (
                asset.uri === "ccdefault:" ||
                asset.uri.endsWith(`.${asset.ext}`) ||
                asset.ext === "unknown"
            );
        },
        {
            message: "URI must end with the file extension."
        }
    );
export type CharacterCardV3Asset = z.infer<typeof CharacterCardV3Asset>;

export const CharacterCardV3Data = z.object({
    ...TavernCardV2Data.shape,
    character_book: LorebookData.optional(),
    assets: z.array(CharacterCardV3Asset),
    nickname: z.string().optional(),
    creator_notes_multilingual: z
        .record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), z.string())
        .optional(),
    source: z.array(
        z.union([
            z.url({
                protocol: /^https?$/,
                hostname: z.regexes.domain,
                normalize: true
            }),
            z.string()
        ])
    ),
    group_only_greetings: z.array(z.string()),
    creation_date: z.union([z.date(), z.coerce.date()]).optional(),
    modification_date: z.union([z.date(), z.coerce.date()]).optional()
});
export type CharacterCardV3Data = z.infer<typeof CharacterCardV3Data>;

export const CharacterCardV3 = z.object({
    spec: z.literal("chara_card_v3"),
    spec_version: z
        .literal("3.0")
        .refine((version) => parseFloat(version) >= 3.0, "spec_version must be a string ≥ 3.0"),
    data: CharacterCardV3Data
});
export type CharacterCardV3 = z.infer<typeof CharacterCardV3>;

const CharacterRecord = z.object({
    id: z.cuid2().default(generateCuid2),
    data: CharacterCardV3Data,
    favorite: z.union([z.literal(0), z.literal(1)]).default(0),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});
type CharacterRecord = z.infer<typeof CharacterRecord>;

export class Character implements CharacterRecord {
    id: string;
    data: CharacterCardV3Data;
    favorite: 0 | 1;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Character["data"]) {
        const record = CharacterRecord.parse({ data });
        this.id = record.id;
        this.data = record.data;
        this.favorite = record.favorite;
        this.createdAt = record.createdAt;
        this.updatedAt = record.updatedAt;
    }

    async save() {
        const record = CharacterRecord.parse(this);
        await db.transaction("rw", [db.characters, db.lorebooks], async () => {
            await db.characters.put(record);
            const lorebook = await db.lorebooks.get({
                embeddedCharacterID: record.id
            });
            if (
                !lorebook &&
                record.data.character_book &&
                record.data.character_book.entries.length > 0
            ) {
                const newLorebook = await Lorebook.import(record.data.character_book);
                newLorebook.data.name = record.data.name;
                newLorebook.embeddedCharacterID = record.id;
                await newLorebook.save();
            }
        });
        Object.assign(this, record);
    }

    static async load(id: string) {
        const character = await db.characters.get(id);
        if (!character) {
            throw new Error(`Invalid character ID ${id}`);
        }
        return character;
    }

    async update(data: Partial<Character["data"]>) {
        const patch = CharacterCardV3Data.partial().parse(data);
        const update = CharacterCardV3Data.parse({ ...this.data, ...patch });
        const now = new Date();
        update.modification_date = now;
        await db.characters.update(this.id, {
            data: update,
            updatedAt: now
        });
        this.data = update;
        this.updatedAt = now;
    }

    async toggleFavorite() {
        const favorite = this.favorite ? 0 : 1;
        const now = new Date();
        await db.characters.update(this.id, {
            favorite: favorite,
            updatedAt: now
        });
        this.favorite = favorite;
        this.updatedAt = now;
    }

    async replaceMainAsset(file: File) {
        const ext = getFileExtension(file.name);
        await db.transaction("rw", [db.characters, db.assets], async () => {
            const pointer = this.data.assets.find(
                (asset) => asset.type === "icon" && asset.name === "main"
            );
            if (!pointer) throw new Error("Failed to update asset, pointer not found");
            const index = this.data.assets.indexOf(pointer);
            if (index === -1) throw new Error("Failed to update asset, pointer index not found");
            const updatedAssets = this.data.assets.toSpliced(index, 1, {
                ...pointer,
                uri:
                    pointer.uri === "ccdefault:"
                        ? pointer.uri
                        : `embedded://${pointer.name}.${ext}`,
                ext: ext
            });
            await this.update({ assets: updatedAssets });
            const asset = await Asset.load(this.id, `main.${pointer.ext}`);
            await asset.update({
                file: new File([file], `main.${ext}`, {
                    type: file.type
                })
            });
        });
    }

    async delete() {
        await db.transaction("rw", [db.characters, db.lorebooks, db.assets], async () => {
            await db.characters.delete(this.id);
            await db.lorebooks.where("embeddedCharacterID").equals(this.id).delete();
            await db.lorebooks
                .where("linkedCharacterIDs")
                .anyOf([this.id])
                .modify((lorebook) => {
                    lorebook.linkedCharacterIDs = lorebook.linkedCharacterIDs.filter(
                        (id) => id !== this.id
                    );
                });
            await db.assets.where("parentID").equals(this.id).delete();
        });
    }
}
