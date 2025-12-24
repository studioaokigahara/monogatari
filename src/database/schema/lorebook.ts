import { z } from "zod";
import { generateCuid2 } from "@/lib/utils";
import { db } from "../database";
import { SillyTavernLorebookConverter } from "./lorebook/sillytavern";

const CharacterBookEntry = z.object({
    keys: z.array(z.string()).default([]),
    content: z.string().default(""),
    extensions: z.record(z.string(), z.any()).default({}),
    enabled: z.boolean().default(true),
    insertion_order: z.number().min(0).default(0),
    case_sensitive: z.boolean().optional().default(false),
    name: z.string().optional().default("New Entry"),
    priority: z.number().optional().default(0),
    id: z.number().optional(),
    comment: z.string().optional(),
    selective: z.boolean().optional().default(false),
    secondary_keys: z.array(z.string()).optional(),
    constant: z.boolean().optional().default(false),
    position: z
        .preprocess(
            (val) => {
                if (val === "" || val == null) return undefined;
                if (Number(val) == 0) return "before_char";
                if (Number(val) == 1) return "after_char";
                return undefined;
            },
            z.enum(["before_char", "after_char"]).optional()
        )
        .default("before_char")
});
type CharacterBookEntry = z.infer<typeof CharacterBookEntry>;

export const CharacterBook = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    scan_depth: z.number().optional().default(Infinity),
    token_budget: z.number().optional().default(Infinity),
    recursive_scanning: z.boolean().optional().default(false),
    extensions: z.record(z.string(), z.any()).default({}),
    entries: z.array(CharacterBookEntry)
});
export type CharacterBook = z.infer<typeof CharacterBook>;

const ChubCharacterBookTransform = CharacterBook.transform((book) => {
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
            if (typeof probability === "number") chub.probability = probability;
            if (typeof selectiveLogic !== "undefined")
                chub.selectiveLogic = selectiveLogic;

            const realSecondary =
                Array.isArray(secondary_keys) && secondary_keys.length
                    ? secondary_keys.filter((key) => key && key.length)
                    : undefined;

            const realSelective = realSecondary ? true : false;

            return {
                ...rest,
                keys: Array.isArray(keys) ? keys.filter((key) => !!key) : [],
                content: entry.content ?? "",
                selective: realSelective,
                secondary_keys: realSecondary,
                extensions: {
                    ...extensions,
                    chub
                }
            };
        })
    };
});

export const LorebookEntry = z
    .object({
        ...CharacterBookEntry.shape,
        use_regex: z.boolean().default(false),
        id: z.union([z.number(), z.string()]).optional().default(generateCuid2)
    })
    .prefault({});
export type LorebookEntry = z.infer<typeof LorebookEntry>;

export const LorebookData = z
    .object({
        ...CharacterBook.shape,
        entries: z.array(LorebookEntry).default([])
    })
    .prefault({});
export type LorebookData = z.infer<typeof LorebookData>;

const ChubLorebookTransform = LorebookData.transform((book) => {
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
            if (typeof probability === "number") chub.probability = probability;
            if (typeof selectiveLogic !== "undefined")
                chub.selectiveLogic = selectiveLogic;

            const realSecondary =
                Array.isArray(secondary_keys) && secondary_keys.length
                    ? secondary_keys.filter((key) => key && key.length)
                    : undefined;

            const realSelective = realSecondary ? true : false;

            return {
                ...rest,
                keys: Array.isArray(keys) ? keys.filter((key) => !!key) : [],
                content: entry.content ?? "",
                selective: realSelective,
                secondary_keys: realSecondary,
                extensions: {
                    ...extensions,
                    chub
                }
            };
        })
    };
});

export const LorebookV3 = z.object({
    spec: z.literal("lorebook_v3"),
    data: LorebookData
});
export type LorebookV3 = z.infer<typeof LorebookV3>;

const LorebookRecord = z
    .object({
        id: z.cuid2().default(generateCuid2),
        data: LorebookData,
        enabled: z.coerce.number<boolean>().default(1),
        global: z.coerce.number<boolean>().default(0),
        embeddedCharacterID: z.string().optional(),
        linkedCharacterIDs: z.array(z.string()).default([]),
        createdAt: z.date().default(() => new Date()),
        updatedAt: z.date().default(() => new Date())
    })
    .prefault({});
type LorebookRecord = z.infer<typeof LorebookRecord>;

export class Lorebook implements LorebookRecord {
    id: string;
    data: LorebookData;
    enabled: number;
    global: number;
    embeddedCharacterID?: string;
    linkedCharacterIDs: string[];
    createdAt: Date;
    updatedAt: Date;

    constructor(data?: Partial<Lorebook>) {
        const record = LorebookRecord.parse(data);
        this.id = record.id;
        this.data = record.data;
        this.enabled = record.enabled;
        this.global = record.global;
        this.linkedCharacterIDs = record.linkedCharacterIDs;
        this.embeddedCharacterID = record.embeddedCharacterID;
        this.createdAt = record.createdAt;
        this.updatedAt = record.updatedAt;
    }

    async save() {
        const record = LorebookRecord.parse(this);
        Object.assign(this, record);
        await db.lorebooks.put(this);
    }

    static async load(id: string) {
        return db.lorebooks.get(id);
    }

    static async parseData(data: unknown) {
        const parsers = [
            LorebookData,
            SillyTavernLorebookConverter,
            ChubLorebookTransform,
            ChubCharacterBookTransform
        ];

        for (const parser of parsers) {
            const result = parser.safeParse(data);
            if (result.success) return result.data;
        }

        throw new Error("Lorebook does not match any implemented schema.");
    }

    static async import(lorebook: File | unknown) {
        let data: LorebookData;

        if (lorebook instanceof File) {
            const text = await lorebook.text();
            const json = await JSON.parse(text);
            data = await this.parseData(json);
            data.name = lorebook.name.split(".json")[0] ?? data.name;
        } else {
            data = await this.parseData(lorebook);
        }

        const newLorebook = new Lorebook({ data });
        await newLorebook.save();

        return newLorebook;
    }

    static validate(data: Partial<Lorebook>) {
        const result = LorebookRecord.safeParse(data);
        return result.success ? undefined : result.error;
    }

    async update(data: Partial<Lorebook>) {
        await db.transaction("rw", [db.lorebooks, db.characters], async () => {
            const record = LorebookRecord.parse({ ...this, ...data });
            record.updatedAt = new Date();
            Object.assign(this, record);
            await db.lorebooks.put(this);
            if (this.embeddedCharacterID) {
                await db.characters
                    .where("id")
                    .equals(this.embeddedCharacterID)
                    .modify((character) => {
                        character.data.character_book = this.data;
                    });
            }
        });
    }

    async delete() {
        await db.lorebooks.delete(this.id);
    }
}
