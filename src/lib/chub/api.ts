import { ButtonState, type Character, type SearchOptions } from "@/types/chub";
import DOMPurify from "dompurify";
import { ThrowError } from "../utils";

function sanitizeText(text: string): string {
    if (!text) return "";

    return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
}

export async function fetchCharacterInfo(
    fullPath: string,
): Promise<{ id: string; description: string; hasGallery: boolean }> {
    const response = await fetch(
        `https://gateway.chub.ai/api/characters/${fullPath}`,
        {
            referrerPolicy: "no-referrer",
        },
    );

    if (!response.ok) {
        ThrowError(
            `Failed to fetch character info: ${(response.status, response.statusText)}`,
        );
    }

    const json = await response.json();
    const node = json.node;

    return {
        id: node.id,
        description: node.description,
        hasGallery: node.hasGallery,
    };
}

export async function fetchGalleryImages(id: string): Promise<Blob[]> {
    const response = await fetch(
        `https://gateway.chub.ai/api/gallery/project/${id}`,
        {
            referrerPolicy: "no-referrer",
        },
    );

    if (!response.ok) {
        ThrowError(
            `Failed to fetch gallery for project ${id}: ${(response.status, response.statusText)}`,
        );
    }

    const json = await response.json();
    const blobs: Blob[] = [];
    const nodes = json.nodes || [];

    for (const node of nodes) {
        const url = node.primary_image_path;
        if (!url) continue;

        const imgResponse = await fetch(url);

        if (!imgResponse.ok) {
            const error = `Failed to download ${url}: ${(imgResponse.status, imgResponse.statusText)}`;
            console.error(error);
            continue;
        }

        blobs.push(await imgResponse.blob());
    }

    if (!blobs.length) {
        console.error(`No images downloaded for project ${id}`);
    }

    return blobs;
}

/**
 * Fetches a character's `chara_card_v2.png`
 */
export async function fetchCharacterImage(character: Character): Promise<Blob> {
    const response = await fetch(character.image);

    if (!response.ok) {
        ThrowError(
            `Failed to fetch ${character.fullPath}: ${(response.status, response.statusText)}`,
        );
    }

    const blob = await response.blob();
    return blob;
}

export async function fetchCharacters(
    searchOptions: SearchOptions,
): Promise<Character[]> {
    try {
        const searchParams = new URLSearchParams();

        if (searchOptions.searchTerm) {
            searchParams.append("search", searchOptions.searchTerm);
        }

        if (searchOptions.creator) {
            searchParams.append("username", searchOptions.creator);
        }

        searchParams.append("first", searchOptions.itemsPerPage.toString());
        searchParams.append("sort", searchOptions.sort || "trending_downloads");
        searchParams.append("namespace", searchOptions.namespace);
        searchParams.append("page", searchOptions.page.toString());
        searchParams.append("asc", searchOptions.sortAscending.toString());
        searchParams.append("include_forks", "true");
        searchParams.append("venus", "true");
        searchParams.append("chub", "true");
        searchParams.append("nsfw", searchOptions.nsfw.toString());
        searchParams.append("nsfl", searchOptions.nsfw.toString());

        const includedTags = searchOptions.includedTags
            .filter((tag) => tag.length)
            .join(",")
            .slice(0, 100);
        if (includedTags.length) searchParams.append("tags", includedTags);

        const excludedTags = searchOptions.excludedTags
            .filter((tag) => tag.length)
            .join(",")
            .slice(0, 100);
        if (excludedTags.length)
            searchParams.append("exclude_tags", excludedTags);

        const settings = JSON.parse(localStorage.getItem("settings") || "");
        const apiKey = settings.chub.apiKey || "";

        const response = await fetch(
            `https://gateway.chub.ai/search?${String(searchParams)}`,
            {
                headers: new Headers({
                    "CH-API-KEY": apiKey,
                    samwise: apiKey,
                }),
                referrerPolicy: "no-referrer",
            },
        );

        if (!response.ok) {
            ThrowError(
                `chub API returned error: ${(response.status, response.statusText)}`,
            );
        }

        const searchResults = await response.json();
        console.log(searchResults);

        const characters: Character[] = searchResults.data.nodes.map(
            (node: any) => {
                return {
                    image: node.max_res_url,
                    avatar: node.avatar_url,
                    description: node.description || "",
                    tagline: sanitizeText(node.tagline || ""),
                    name: node.name,
                    fullPath: node.fullPath,
                    tags: node.topics || [],
                    creator: node.fullPath.split("/")[0],
                    downloadCount: node.starCount || 0,
                    lastActivityAt:
                        node.lastActivityAt || new Date().toISOString(),
                    createdAt: node.createdAt || new Date().toISOString(),
                    numTokens: node.nTokens || 0,
                    numfavorites: node.n_favorites || 0,
                    rating: node.rating || 0,
                    numRatings: node.ratingCount || 0,
                    buttonState: ButtonState.READY_DOWNLOAD,
                };
            },
        );

        return characters.filter((char) => char !== null);
    } catch (error) {
        ThrowError("Error fetching characters", error as Error);
    }
}
