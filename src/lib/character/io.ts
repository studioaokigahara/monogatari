import { Asset } from "@/database/schema/asset";
import {
    Character,
    CharacterCardV3,
    type CharacterCardV3Asset,
    CharacterCardV3Data,
    TavernCardV2,
    TavernCardV2Data
} from "@/database/schema/character";
import { router } from "@/lib/router";
import { decode, encode as encodeChunk } from "png-chunk-text";
import encode from "png-chunks-encode";
import extractChunks from "png-chunks-extract";
import { toast } from "sonner";
import { unzip } from "unzipit";
import { z } from "zod";

const base64codec = z.codec(z.base64(), z.string(), {
    decode: (base64) => {
        return new TextDecoder().decode(z.util.base64ToUint8Array(base64));
    },
    encode: (string) => {
        return z.util.uint8ArrayToBase64(new TextEncoder().encode(string));
    }
});

const TavernCardV2Importer = TavernCardV2.extend({
    data: TavernCardV2Data.transform((data) => {
        const normalize = (value: string) => value.replace(/\r\n/g, "\n");

        const walk = (value: unknown): unknown => {
            if (value instanceof Date) return value;
            if (typeof value === "string") return normalize(value);
            if (Array.isArray(value)) return value.map(walk);
            if (value && typeof value === "object") {
                const output: Record<string, unknown> = {};
                for (const [key, keyValue] of Object.entries(value)) {
                    output[key] = walk(keyValue);
                }
                return output;
            }
            return value;
        };

        return walk(data) as TavernCardV2Data;
    })
        .transform((data) => {
            const allowedKeys = new Set(Object.keys(TavernCardV2Data.shape));
            const extras = Object.entries(data).filter(
                ([key]) => !allowedKeys.has(key)
            );

            for (const [key] of extras) delete data[key];

            return {
                ...data,
                extensions: {
                    ...data.extensions,
                    ...extras
                }
            };
        })
        .transform((data) => {
            if (data.character_book === null) {
                data.character_book = undefined;
            }

            return data;
        })
});

const CharacterCardV3Importer = CharacterCardV3.extend({
    data: CharacterCardV3Data.transform((data) => {
        const normalize = (value: string) => value.replace(/\r\n/g, "\n");

        const walk = (value: unknown): unknown => {
            if (value instanceof Date) return value;
            if (typeof value === "string") return normalize(value);
            if (Array.isArray(value)) return value.map(walk);
            if (value && typeof value === "object") {
                const output: Record<string, unknown> = {};
                for (const [key, keyValue] of Object.entries(value)) {
                    output[key] = walk(keyValue);
                }
                return output;
            }
            return value;
        };

        return walk(data) as CharacterCardV3Data;
    })
        .transform((data) => {
            const allowedKeys = new Set(Object.keys(CharacterCardV3Data.shape));
            const extras = Object.entries(data).filter(
                ([key]) => !allowedKeys.has(key)
            );

            for (const [key] of extras) delete data[key];

            return {
                ...data,
                extensions: {
                    ...data.extensions,
                    ...extras
                }
            };
        })
        .transform((data) => {
            if (data.character_book === null) {
                data.character_book = undefined;
            }

            return data;
        })
});

export function readCharacterImage(image: ArrayBuffer) {
    const chunks = extractChunks(new Uint8Array(image));

    const tEXtChunks = chunks
        .filter((chunk) => chunk.name === "tEXt")
        .map((chunk) => decode(chunk.data));

    if (!tEXtChunks.length) {
        throw new Error("Uploaded PNG does not contain any tEXt chunks");
    }

    const ccv3Index = tEXtChunks.findIndex(
        (chunk) => chunk.keyword.toLowerCase() === "ccv3"
    );

    if (ccv3Index > -1) {
        return base64codec.decode(tEXtChunks[ccv3Index].text);
    }

    const charaIndex = tEXtChunks.findIndex(
        (chunk) => chunk.keyword.toLowerCase() === "chara"
    );

    if (charaIndex > -1) {
        return base64codec.decode(tEXtChunks[charaIndex].text);
    }

    throw new Error("Uploaded PNG did not contain any character data.");
}

export function writeCharacterImage(image: ArrayBuffer, data: string) {
    const chunks = extractChunks(new Uint8Array(image));
    const tEXtChunks = chunks.filter((chunk) => chunk.name === "tEXt");

    for (const chunk of tEXtChunks) {
        const data = decode(chunk.data);
        if (data.keyword.toLowerCase() === "ccv3") {
            chunks.splice(chunks.indexOf(chunk), 1);
        }
    }

    const v3Data = JSON.parse(data);
    v3Data.spec = "chara_card_v3";
    v3Data.spec_version = "3.0";

    const base64v3Data = base64codec.encode(JSON.stringify(v3Data));
    chunks.splice(-1, 0, encodeChunk("ccv3", base64v3Data));

    return new Uint8Array(encode(chunks));
}

async function extractAssetRecord(
    characterID: string,
    pointers: CharacterCardV3Asset[],
    imageBuffer?: ArrayBuffer,
    embeddedResolver?: (path: string) => Promise<Blob | null>
) {
    const newPointers: CharacterCardV3Asset[] = [];

    if (imageBuffer) {
        const asset = new Asset({
            category: "character",
            parentID: characterID,
            file: new File([imageBuffer], "main.png", { type: "image/png" })
        });
        await asset.save();
        newPointers.push({
            type: "icon",
            uri: "ccdefault:",
            name: "main",
            ext: "png"
        });
    }

    const pointerPromises = pointers.map(async (pointer) => {
        const uriType = pointer.uri.split(":")[0];
        let blob: Blob;

        switch (uriType) {
            case "ccdefault":
                throw new Error("ccdefault uri, skipping");
            case "embeded":
            case "embedded":
                if (!embeddedResolver) {
                    throw new Error("No resolver for embedded assets");
                }
                const path = pointer.uri.split("://")[1];
                if (!path) {
                    throw new Error(
                        `Invalid embedded asset URI: ${pointer.uri}`
                    );
                }
                const resolved = await embeddedResolver(path);
                if (!resolved) {
                    throw new Error(
                        `Embedded asset not found for path ${path}`
                    );
                }
                blob = resolved;
                break;
            case "data":
                const [head, base64] = pointer.uri.split(",");
                const array = z.util.base64ToUint8Array(base64);

                const mimeType =
                    head.match(/data:(.+);base64/)?.[1] ??
                    "application/octet-stream";

                blob = new Blob([array], { type: mimeType });
                break;
            default:
                const response = await fetch(pointer.uri);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch ${pointer.uri}: ${response.status} ${response.statusText}`
                    );
                }
                blob = await response.blob();
        }

        const asset = new Asset({
            category: "character",
            parentID: characterID,
            file: new File([blob], `${pointer.name}.${pointer.ext}`, {
                type: blob.type
            })
        });

        await asset.save();

        const normalizedURI = uriType === "embeded" ? "embedded" : uriType;

        return {
            type: pointer.type,
            uri: `${normalizedURI}://${pointer.name}.${pointer.ext}`,
            name: pointer.name,
            ext: pointer.ext
        };
    });

    const settledPointers = await Promise.allSettled(pointerPromises);
    settledPointers.forEach((result, index) => {
        if (result.status === "fulfilled") {
            newPointers.push(result.value);
        } else {
            console.error(
                `Failed to process pointer ${pointers[index].uri}:`,
                result.reason
            );
        }
    });

    return newPointers;
}

export async function importCharacter(
    parsedJSON: CharacterCardV3 | TavernCardV2,
    imageBuffer?: ArrayBuffer,
    redirect = false,
    embeddedResolver?: (path: string) => Promise<Blob | null>
) {
    let data: CharacterCardV3Data;

    if (parsedJSON.spec === "chara_card_v3") {
        data = CharacterCardV3Importer.parse(parsedJSON).data;
    } else if (parsedJSON.spec === "chara_card_v2") {
        const v2 = TavernCardV2Importer.parse(parsedJSON).data;
        data = CharacterCardV3Data.parse(v2);
    } else {
        throw new Error(
            "Uploaded card does not conform to either the Character Card V2 or V3 schema."
        );
    }

    const character = new Character({ data });

    const pointers = await extractAssetRecord(
        character.id,
        character.data.assets,
        imageBuffer,
        embeddedResolver
    );

    character.data.assets = pointers;
    await character.save();

    if (redirect) {
        toast.success(`${character.data.name} imported successfully!`);
        void router.navigate({
            to: `/characters/$id`,
            params: { id: character.id }
        });
    }

    return character;
}

export async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    let parsedJSON;
    const rawBuffer = await file.arrayBuffer();

    if (file.name.endsWith(".charx")) {
        const { entries } = await unzip(rawBuffer);

        const keys = Object.keys(entries);
        const cardKey = keys.find((key) => key === "card.json");

        if (!cardKey) {
            toast.error("Uploaded CharX is missing card.json");
            return;
        }

        const card = entries[cardKey];
        parsedJSON = await card.json();

        const embeddedResolver = async (path: string) => {
            const file = entries[path];
            if (!file) return null;
            return await file.blob();
        };

        await importCharacter(parsedJSON, undefined, true, embeddedResolver);
        return;
    }

    switch (file.type) {
        case "image/png":
            parsedJSON = JSON.parse(readCharacterImage(rawBuffer));
            break;
        case "application/json":
            parsedJSON = JSON.parse(new TextDecoder().decode(rawBuffer));
            break;
        default:
            toast.error(
                `Unsupported file type ${file.type}. Make sure to upload a valid .json, .png, or .charx.`
            );
            return;
    }

    await importCharacter(parsedJSON, rawBuffer, true);
}
