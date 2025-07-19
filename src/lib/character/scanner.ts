import { CharacterManager } from "@/database/characters";
import type { AssetRecord, CharacterRecord } from "@/database/schema/character";
import { downloadAsset, extractImageUrls } from "@/lib/character/utils";
import { fetchCharacterInfo, fetchGalleryImages } from "@/lib/chub/api";

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
    character: CharacterRecord,
    { onLog = () => {}, onProgress = () => {} }: ScanCallbacks = {}
): Promise<ScanResult> {
    onLog("Starting scan...");
    const fields = [
        character.data.first_mes,
        character.data.description,
        ...character.data.alternate_greetings,
        ...character.data.group_only_greetings
    ].filter(Boolean);

    const charURLs = Array.from(
        new Set(fields.flatMap((f) => extractImageUrls(f)))
    );
    if (charURLs.length === 0) {
        onLog("No image URLs found in character fields.");
    }

    const downloads: Job[] = charURLs.map((url) => ({ type: "url", url }));

    onLog("Fetching chub.ai metadata...");
    const fullPath = character.data.extensions?.chub?.full_path;
    let info = null;
    if (fullPath) {
        info = await fetchCharacterInfo(fullPath);
        if (!info) {
            onLog("✘ Failed to fetch chub.ai info.");
        }
    } else {
        onLog(`No chub.ai path found for ${character.data.name}.`);
    }

    let descURLs: string[] = [];
    let galleryBlobs: Blob[] = [];
    if (info) {
        descURLs = extractImageUrls(info.description);
        onLog(`Found ${descURLs.length} image(s) in description.`);
        downloads.push(
            ...descURLs.map((url) => ({ type: "url" as const, url }))
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
    const urlCountTotal = charURLs.length + descURLs.length;
    const urlToEmbedded = new Map<string, string>();
    let urlCount = 0;
    let galleryCount = 0;

    for (let i = 0; i < downloads.length; i++) {
        const step = i + 1;
        onProgress(step, total);

        const job = downloads[i];
        if (job.type === "url") {
            urlCount++;
            onLog(
                `(${step}/${total}) Downloading URL ${urlCount} of ${urlCountTotal}: ${job.url}...`
            );
            try {
                const asset = await downloadAsset(job.url);
                await CharacterManager.addAssets(character.id, [asset]);
                urlToEmbedded.set(
                    job.url,
                    `embedded://${asset.name}.${asset.ext}`
                );
                onLog(`✔ Saved ${job.url}`);
            } catch (e) {
                console.error(e);
                onLog(`✘ Failed to download ${job.url}`);
            }
        } else {
            galleryCount++;
            onLog(
                `(${step}/${total}) Saving gallery image ${galleryCount} of ${galleryBlobs.length}...`
            );
            const asset: AssetRecord = {
                blob: job.blob,
                type: "x_gallery",
                name: `gallery_${Date.now()}`,
                ext: job.blob.type.split("/")[1]
            };
            await CharacterManager.addAssets(character.id, [asset]);
            onLog(`✔ Saved gallery image #${galleryCount}`);
        }
    }

    await CharacterManager.replaceImageURLs(character.id, urlToEmbedded);
    onLog(`Replaced ${urlToEmbedded.size} URLs with embedded images.`);
    onLog("Scan complete.");

    return { replaced: urlToEmbedded.size, total };
}
