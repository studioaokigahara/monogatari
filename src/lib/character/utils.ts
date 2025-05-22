import { addCharacter } from "@/database/characters";
import {
    type AssetRecord,
    CharacterCardV3,
    type CharacterCardV3Asset,
    type CharacterCardV3Data,
    CharacterRecord,
    TavernCardV2,
    type TavernCardV2Data,
} from "@/database/schema/character";
import { ThrowError, decodeBase64, encodeBase64, nanoid } from "@/lib/utils";
import { router } from "@/router";
import { decode, encode as encodeChunk } from "png-chunk-text";
import encode from "png-chunks-encode";
import extractChunks from "png-chunks-extract";
import { toast } from "sonner";
import type { z } from "zod";

export function readCharacterImage(image: ArrayBuffer) {
    const chunks = extractChunks(new Uint8Array(image));

    const tEXtChunks = chunks
        .filter((chunk) => chunk.name === "tEXt")
        .map((chunk) => decode(chunk.data));

    if (!tEXtChunks.length) {
        const errorMessage = "PNG does not contain any tEXt chunks.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const ccv3Index = tEXtChunks.findIndex(
        (chunk) => chunk.keyword.toLowerCase() === "ccv3",
    );

    if (ccv3Index > -1) {
        return decodeBase64(tEXtChunks[ccv3Index].text);
    }

    const charaIndex = tEXtChunks.findIndex(
        (chunk) => chunk.keyword.toLowerCase() === "chara",
    );

    if (charaIndex > -1) {
        return decodeBase64(tEXtChunks[charaIndex].text);
    }

    ThrowError("Uploaded PNG did not contain any character data");
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

    const base64v3Data = encodeBase64(JSON.stringify(v3Data));
    chunks.splice(-1, 0, encodeChunk("ccv3", base64v3Data));

    return new Uint8Array(encode(chunks));
}

function dataUrlToBlob(dataUrl: string): Blob {
    const [head, base64] = dataUrl.split(",");
    const mime =
        head.match(/data:(.+);base64/)?.[1] || "application/octet-stream";
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
}

async function extractAssetRecord(
    assets: CharacterCardV3Asset[],
    imageBuffer?: ArrayBuffer,
): Promise<[AssetRecord[], CharacterCardV3Asset[]]> {
    const assetRecords: AssetRecord[] = [];
    const pointers: CharacterCardV3Asset[] = [];

    for (const asset of assets || []) {
        let blob: Blob;

        if (asset.uri.startsWith("embedded://")) {
            if (imageBuffer && asset.name === "main") {
                blob = new Blob([imageBuffer], { type: "image/png" });
            } else {
                console.error("embedded:// not implemented yet");
                continue;
            }
        } else if (asset.uri.startsWith("data://")) {
            blob = dataUrlToBlob(asset.uri);
        } else if (asset.uri.startsWith("ccdefault://")) {
            console.error("ccdefault:// not implemented yet");
            continue;
        } else {
            const response = await fetch(asset.uri);

            if (!response.ok) {
                console.error(`Failed to fetch asset: ${asset.uri}`);
                continue;
            }

            blob = await response.blob();
        }

        assetRecords.push({
            blob: blob,
            type: asset.type,
            name: asset.name,
            ext: asset.ext,
        });
        pointers.push({
            type: asset.type,
            uri: `embedded://${asset.name}.${asset.ext}`,
            name: asset.name,
            ext: asset.ext,
        });
    }

    return [assetRecords, pointers];
}

export async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    let parsedJSON;
    const rawBuffer = await file.arrayBuffer();

    switch (file.type) {
        case "image/png":
            parsedJSON = JSON.parse(readCharacterImage(rawBuffer));
            break;
        case "application/json":
            parsedJSON = JSON.parse(new TextDecoder().decode(rawBuffer));
            break;
        default:
            ThrowError(`Unsupported file type ${file.type}`);
    }

    await importCharacter(parsedJSON, rawBuffer, true);
}

export async function importCharacter(
    parsedJSON: unknown,
    imageBuffer?: ArrayBuffer,
    redirect = false,
) {
    let data:
        | z.infer<typeof CharacterCardV3Data>
        | z.infer<typeof TavernCardV2Data>;
    const V3Parse = CharacterCardV3.safeParse(parsedJSON);

    if (V3Parse.success) {
        data = V3Parse.data.data;
        console.log("Parsed as V3 spec:", data);
    } else {
        console.warn(
            "V3 validation failed, attempting V2 fallback...",
            V3Parse.error,
        );
        toast.warning("V3 validation failed, attempting V2 fallback…");
        console.log(parsedJSON);

        const V2Parse = TavernCardV2.safeParse(parsedJSON);
        if (!V2Parse.success) {
            ThrowError(
                "Uploaded character does not conform to V2 or V3 schema",
                V2Parse.error,
            );
        }

        data = V2Parse.data.data;
        console.log("Parsed using V2 schema.");
    }

    if (imageBuffer) {
        data.assets = data.assets || [];
        data.assets.unshift({
            type: "icon",
            uri: `embedded://main.png`,
            name: "main",
            ext: "png",
        });
    }

    const [assetRecord, pointers] = await extractAssetRecord(
        data.assets,
        imageBuffer,
    );
    data.assets = pointers;

    const record = CharacterRecord.safeParse({
        id: nanoid(),
        data,
        assets: assetRecord,
        tagline: data.creator_notes,
        favorite: false,
    });

    if (!record.success) {
        ThrowError(`Failed to parse character record`, record.error);
    }

    await addCharacter(record.data);
    toast.success(`${record.data.data.name} imported successfully!`);
    if (redirect) {
        router.navigate({
            to: `/characters/$id`,
            params: { id: record.data.id },
        });
    }
    return record.data;
}

export function extractImageUrls(text: string): string[] {
    const urlRegex = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)/gi;
    const allMatches = text.match(urlRegex) || [];
    return Array.from(new Set(allMatches));
}

export async function downloadAsset(url: string): Promise<AssetRecord> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch asset: ${url}`);
    const blob = await resp.blob();
    // infer extension
    const extMatch = url.match(/\.(png|jpe?g|gif|webp)(?:\?.*)?$/i);
    const ext = (extMatch?.[1] || "unknown").toLowerCase();
    const name = `gallery_${Date.now()}`;
    return {
        blob: blob,
        type: "x_gallery",
        name: name,
        ext: ext,
    };
}
