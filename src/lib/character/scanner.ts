import { Asset } from "@/database/schema/asset";
import { Character, CharacterCardV3Asset } from "@/database/schema/character";
import { fetchCharacterInfo, fetchGalleryImages } from "@/lib/explore/chub/api";

function extractImageURLs(text: string): string[] {
    const urlRegex = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)/gi;
    const allMatches = text.match(urlRegex) || [];
    return Array.from(new Set(allMatches));
}

async function downloadAsset(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch asset from ${url}`);

    const blob = await response.blob();
    const extMatch = url.match(/\.(png|jpe?g|gif|webp)(?:\?.*)?$/i);
    const ext = (extMatch?.[1] || "unknown").toLowerCase();
    const name = `gallery_${Date.now()}`;
    const file = new File([blob], `${name}.${ext}`, { type: blob.type });

    return {
        file: file,
        pointer: {
            uri: `embedded://${name}.${ext}`,
            type: "x_gallery",
            name: name,
            ext: ext
        }
    };
}

type Job = { type: "url"; url: string } | { type: "blob"; blob: Blob };

interface ScanCallbacks {
    onLog?: (line: string) => void;
    onProgress?: (current: number, total: number) => void;
}

interface ScanResult {
    replaced: number;
    total: number;
}

/**
 * Scans character fields and external gallery for images, downloads them,
 * stores them as assets, and replaces URLs in character data with embedded references.
 */
export async function scanGallery(
    character: Character,
    { onLog = () => {}, onProgress = () => {} }: ScanCallbacks = {}
): Promise<ScanResult> {
    onLog("Starting scan...");

    const fields = [
        character.data.first_mes,
        character.data.description,
        ...character.data.alternate_greetings,
        ...character.data.group_only_greetings
    ].filter(Boolean);

    const characterURLs = Array.from(
        new Set(fields.flatMap((field) => extractImageURLs(field)))
    );

    if (characterURLs.length > 0) {
        onLog(
            `Found ${characterURLs.length} image(s) in ${character.data.name}'s card.`
        );
    } else {
        onLog("No image URLs found in character fields.");
    }

    const downloads: Job[] = characterURLs.map((url) => ({ type: "url", url }));

    onLog("Fetching chub.ai metadata...");

    let info = null;
    const fullPath = character.data.extensions?.chub?.full_path;
    if (fullPath) {
        info = await fetchCharacterInfo(fullPath);
        if (!info) {
            onLog("✘ Failed to fetch chub.ai info.");
        }
    } else {
        onLog(`No chub.ai path found for ${character.data.name}.`);
    }

    let chubURLs: string[] = [];
    let galleryBlobs: Blob[] = [];
    if (info) {
        chubURLs = extractImageURLs(info.description);

        onLog(`Found ${chubURLs.length} image(s) in chub.ai description.`);

        downloads.push(
            ...chubURLs.map((url) => ({ type: "url" as const, url }))
        );

        if (info.hasGallery) {
            onLog("Fetching gallery images...");
            galleryBlobs = await fetchGalleryImages(info.id);
            onLog(`Found ${galleryBlobs.length} gallery image(s).`);
            downloads.push(
                ...galleryBlobs.map((blob) => ({
                    type: "blob" as const,
                    blob
                }))
            );
        } else {
            onLog(`No gallery found for ID ${info.id}.`);
        }
    }

    const total = downloads.length;
    const totalURLCount = characterURLs.length + chubURLs.length;
    const urlPointerMap = new Map<string, string>();

    let urlCount = 0;
    let galleryCount = 0;
    for (let i = 0; i < downloads.length; i++) {
        const step = i + 1;
        onProgress(step, total);

        const job = downloads[i];
        if (job.type === "url") {
            urlCount++;

            onLog(
                `(${step}/${total}) Downloading from URL ${urlCount} of ${totalURLCount}: ${job.url}...`
            );

            try {
                const download = await downloadAsset(job.url);
                await character.update({
                    assets: [...character.data.assets, download.pointer]
                });
                const asset = new Asset({
                    category: "character",
                    parentID: character.id,
                    file: download.file
                });
                await asset.save();
                urlPointerMap.set(
                    job.url,
                    `embedded://${download.pointer.name}.${download.pointer.ext}`
                );
                onLog(`✔ Downloaded ${job.url}.`);
            } catch (error) {
                console.error(error);
                onLog(`✘ Failed to download ${job.url}.`);
            }
        } else {
            galleryCount++;

            onLog(
                `(${step}/${total}) Saving gallery image ${galleryCount} of ${galleryBlobs.length}...`
            );

            const name = `gallery_${Date.now()}`;
            const ext = job.blob.type.split("/")[1] ?? "unknown";
            const pointer: CharacterCardV3Asset = {
                type: "x_gallery",
                uri: `embedded://${name}.${ext}`,
                name,
                ext
            };
            await character.update({
                assets: [...character.data.assets, pointer]
            });
            const asset = new Asset({
                category: "character",
                parentID: character.id,
                file: new File([job.blob], `${name}.${ext}`, {
                    type: job.blob.type ?? "application/octet-stream"
                })
            });
            await asset.save();
            onLog(`✔ Saved gallery image #${galleryCount}.`);
        }
    }

    const replaceAll = (string: string, map: Map<string, string>) => {
        let output = string;
        for (const [from, to] of map) {
            output = output.split(from).join(to);
        }
        return output;
    };

    const fieldKeys = [
        "first_mes",
        "description",
        "alternate_greetings",
        "group_only_greetings"
    ];

    const updatedData = character.data;

    for (const key of fieldKeys) {
        const value = updatedData[key];
        if (typeof value === "string") {
            (updatedData as Record<typeof key, string | string[]>)[key] =
                replaceAll(value, urlPointerMap);
        } else if (Array.isArray(value)) {
            (updatedData as Record<typeof key, string | string[]>)[key] =
                value.map((string) => replaceAll(string, urlPointerMap));
        }
    }

    await character.update({ updatedData });

    onLog(
        `Scan complete. Replaced ${urlPointerMap.size} URLs with embedded images.`
    );

    return { replaced: urlPointerMap.size, total };
}
