import { db } from "@/database/database";
import type {
    AssetRecord,
    CharacterRecord,
    CharacterCardV3Data
} from "@/database/schema/character";

export class CharacterManager {
    static add(record: CharacterRecord) {
        return db.characters.add(record);
    }

    static save(
        id: string,
        data: CharacterCardV3Data,
        assets: AssetRecord[] = []
    ) {
        const record: CharacterRecord = {
            id,
            data,
            assets,
            tagline: data.description.slice(0, 100) || "No description",
            favorite: false
        };

        return db.characters.add(record);
    }

    static async update(id: string, data: Partial<CharacterRecord["data"]>) {
        await db.characters.where("id").equals(id).modify((record)=>{
            Object.assign(record.data, data);
            record.data.modification_date = new Date();
        })
    }

    static async get(id: string) {
        const character = await db.characters.get(id);
        if (!character) throw new Error(`Character ID ${id} not found`);
        return character;
    }

    static async delete(id: string) {
        await db.characters.delete(id);
    }

    static async updateField(
        id: string,
        field: string,
        value: string | string[]
    ) {
        await db.characters
            .where("id")
            .equals(id)
            .modify((record) => {
                record.data[field] = value;
            });
    }

    static async addAssets(id: string, newAssets: AssetRecord[]) {
        await db.characters
            .where("id")
            .equals(id)
            .modify((record) => {
                const existingAssets = record.assets || [];
                record.assets = [...existingAssets, ...newAssets];

                const existingPointers = record.data.assets || [];
                const additionalPointers = newAssets.map((asset) => ({
                    type: asset.type,
                    uri: `embedded://${asset.name}.${asset.ext}`,
                    name: asset.name,
                    ext: asset.ext
                }));

                record.data.assets = [
                    ...existingPointers,
                    ...additionalPointers
                ];
            });
    }

    static async updateAssets(id: string, updatedAssets: AssetRecord[]) {
        await db.characters.update(id, { assets: updatedAssets });
    }

    static async replaceAssetBlob(
        characterId: string,
        assetName: string,
        newBlob: Blob,
        newExt: string
    ): Promise<number> {
        return db.characters
            .where("id")
            .equals(characterId)
            .modify((rec) => {
                rec.assets = rec.assets.map((asset) =>
                    asset.name === assetName
                        ? { ...asset, blob: newBlob, ext: newExt }
                        : asset
                );

                rec.data.assets = rec.data.assets.map((pointer) =>
                    pointer.name === assetName
                        ? {
                              ...pointer,
                              uri: `embedded://${pointer.name}.${newExt}`
                          }
                        : pointer
                );
            });
    }

    static async replaceImageURLs(
        id: string,
        embeddedURLMap: Map<string, string>
    ) {
        await db.characters
            .where("id")
            .equals(id)
            .modify((rec) => {
                const replaceAll = (str: string, map: Map<string, string>) => {
                    let out = str;
                    for (const [from, to] of map) {
                        out = out.split(from).join(to);
                    }
                    return out;
                };

                type K =
                    | "first_mes"
                    | "description"
                    | "alternate_greetings"
                    | "group_only_greetings";
                const fields: K[] = [
                    "first_mes",
                    "description",
                    "alternate_greetings",
                    "group_only_greetings"
                ];

                for (const key of fields) {
                    const val = rec.data[key as any];
                    if (typeof val === "string") {
                        rec.data[key as any] = replaceAll(val, embeddedURLMap);
                    } else if (Array.isArray(val)) {
                        rec.data[key as any] = val.map((txt) =>
                            replaceAll(txt, embeddedURLMap)
                        );
                    }
                }
            });
    }
}
