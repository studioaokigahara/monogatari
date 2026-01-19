import { db } from "@/database/monogatari-db";
import { generateCuid2 } from "@/lib/utils";
import z from "zod";

const AssetRecord = z.object({
    id: z.cuid2().default(generateCuid2),
    category: z.enum(["character", "persona"]),
    parentID: z.cuid2(),
    file: z.file(),
    createdAt: z.date().default(() => new Date())
});
type AssetRecord = z.infer<typeof AssetRecord>;

export class Asset implements AssetRecord {
    id: string;
    category: "character" | "persona";
    parentID: string;
    file: File;
    createdAt: Date;

    constructor(data: Pick<Asset, "category" | "parentID" | "file">) {
        const record = AssetRecord.parse(data);
        this.id = record.id;
        this.category = record.category;
        this.parentID = record.parentID;
        this.file = record.file;
        this.createdAt = record.createdAt;
    }

    async save() {
        const record = AssetRecord.parse(this);
        await db.assets.put(record);
        Object.assign(this, record);
    }

    static async load(id: string, filename: string) {
        const asset = await db.assets.get({
            "[parentID+file.name]": [id, filename]
        });
        if (!asset) {
            throw new Error(`Invalid asset ${id}/${filename}`);
        }
        return asset;
    }

    static async loadPersonaAsset(id: string) {
        const asset = await db.assets.get({ "[category+parentID]": ["persona", id] });
        if (!asset) {
            throw new Error(`Invalid persona ID ${id}`);
        }
        return asset;
    }

    async update(data: Partial<Asset>) {
        const update = AssetRecord.partial().parse(data);
        await db.assets.update(this.id, update);
        Object.assign(this, update);
    }

    async delete() {
        await db.assets.delete(this.id);
    }
}
