import { db } from "@/database/database";
import type { AssetRecord, CharacterRecord } from "@/database/schema/character";

export async function addCharacter(record: CharacterRecord) {
    return db.characters.add(record);
}

export async function addAssets(id: string, newAssets: AssetRecord[]) {
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
                ext: asset.ext,
            }));

            record.data.assets = [...existingPointers, ...additionalPointers];
        });
}

export async function replaceImageUrls(
    id: string,
    embeddedURLMap: Map<string, string>,
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
                "group_only_greetings",
            ];

            for (const key of fields) {
                const val = rec.data[key as any];
                if (typeof val === "string") {
                    rec.data[key as any] = replaceAll(val, embeddedURLMap);
                } else if (Array.isArray(val)) {
                    rec.data[key as any] = val.map((txt) =>
                        replaceAll(txt, embeddedURLMap),
                    );
                }
            }
        });
}
