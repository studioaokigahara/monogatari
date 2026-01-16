import {
    ChubCharacterResponse,
    ChubGalleryResponse,
    type ChubCharacter,
    type SearchOptions
} from "@/types/explore/chub";

export async function fetchCharacterInfo(fullPath: string) {
    const response = await fetch(`https://gateway.chub.ai/api/characters/${fullPath}`, {
        referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch character info: ${(response.status, response.statusText)}`
        );
    }

    const json: ChubCharacterResponse = await response.json();
    const node = json.node;

    return {
        id: node.id,
        description: node.description,
        hasGallery: node.hasGallery
    };
}

export async function fetchGalleryImages(id: number): Promise<Blob[]> {
    const response = await fetch(`https://gateway.chub.ai/api/gallery/project/${id}`, {
        referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch gallery for project ${id}: ${(response.status, response.statusText)}`
        );
    }

    const json: ChubGalleryResponse = await response.json();
    const nodes = json.nodes || [];

    const urls = nodes.map((node) => node.primary_image_path).filter(Boolean);

    const imageBlobs = urls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${(response.status, response.statusText)}`);
        }
        return await response.blob();
    });

    const blobs: Blob[] = [];
    const settledBlobs = await Promise.allSettled(imageBlobs);
    settledBlobs.forEach((result, index) => {
        if (result.status === "fulfilled") {
            blobs.push(result.value);
        } else {
            console.error(`Download failed for ${urls[index]}:`, result.reason);
        }
    });

    if (!blobs.length) {
        console.error(`No images downloaded for project ${id}`);
    }

    return blobs;
}

/**
 * Fetches a character's `chara_card_v2.png`
 */
export async function fetchCharacterImage(character: ChubCharacter): Promise<Blob> {
    const response = await fetch(character.max_res_url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${character.fullPath}: ${(response.status, response.statusText)}`
        );
    }

    const blob = await response.blob();
    return blob;
}

export async function fetchCharacterJSON(character: ChubCharacter) {
    const response = await fetch(
        `https://gateway.chub.ai/api/v4/projects/${character.id}/repository/files/card.json/raw?ref=main&response_type=blob`,
        {
            referrerPolicy: "no-referrer"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch JSON for ${character.id}: ${(response.status, response.statusText)}`
        );
    }

    const json = await response.json();
    return json;
}

export async function fetchCharacters(searchOptions: SearchOptions): Promise<ChubCharacter[]> {
    const searchParams = new URLSearchParams();

    searchParams.append("search", searchOptions.searchTerm);
    searchParams.append("username", searchOptions.creator);
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
    searchParams.append("inclusive_or", searchOptions.inclusiveOr.toString());
    searchParams.append("tags", searchOptions.includedTags);
    searchParams.append("exclude_tags", searchOptions.excludedTags);

    const settings = JSON.parse(localStorage.getItem("settings") ?? "");
    const apiKey = settings.apiKeys.chub ?? "";

    const response = await fetch(`https://gateway.chub.ai/search?${String(searchParams)}`, {
        headers: new Headers({
            "CH-API-KEY": apiKey,
            samwise: apiKey
        }),
        referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
        throw new Error(`chub API returned error: ${(response.status, response.statusText)}`);
    }

    const searchResults = await response.json();

    const characters: ChubCharacter[] = searchResults.data.nodes.filter(
        (character: ChubCharacter) => character !== null
    );

    return characters;
}
