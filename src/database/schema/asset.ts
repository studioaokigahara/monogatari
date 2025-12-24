import { generateCuid2 } from "@/lib/utils";
import z from "zod";
import { db } from "../database";

const AssetRecord = z.object({
    id: z.cuid2().default(generateCuid2),
    category: z.enum(["character", "persona"]),
    parentID: z.cuid2(),
    file: z.instanceof(File),
    createdAt: z.date().default(() => new Date())
});
type AssetRecord = z.infer<typeof AssetRecord>;

export class Asset implements AssetRecord {
    id: string;
    category: "character" | "persona";
    parentID: string;
    file: File;
    createdAt: Date;

    constructor(data: Omit<Asset, "id" | "createdAt">) {
        const record = AssetRecord.parse(data);
        this.id = record.id;
        this.category = record.category;
        this.parentID = record.parentID;
        this.file = record.file;
        this.createdAt = record.createdAt;
    }

    async save() {
        const record = AssetRecord.parse(this);
        Object.assign(this, record);
        await db.assets.put(this);
    }

    static async load(id: string, fileName: string) {
        return db.assets.get({
            "[parentID+file.name]": [id, fileName]
        });
    }

    static async loadPersonaAsset(id: string) {
        return db.assets.get({ "[category+parentID]": ["persona", id] });
    }

    async update(data: Partial<Asset>) {
        const record = AssetRecord.parse({ ...this, ...data });
        Object.assign(this, record);
        await db.assets.put(this);
    }

    async delete() {
        await db.assets.delete(this.id);
    }
}
