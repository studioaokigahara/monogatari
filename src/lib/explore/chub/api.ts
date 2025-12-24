import { type ChubCharacter, type SearchOptions } from "@/types/explore/chub";
export async function fetchCharacterInfo(
    fullPath: string
): Promise<{ id: string; description: string; hasGallery: boolean }> {
    const response = await fetch(
        `https://gateway.chub.ai/api/characters/${fullPath}`,
        {
            referrerPolicy: "no-referrer"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch character info: ${(response.status, response.statusText)}`
        );
    }

    const json = await response.json();
    const node = json.node;

    return {
        id: node.id,
        description: node.description,
        hasGallery: node.hasGallery
    };
}

export async function fetchGalleryImages(id: string): Promise<Blob[]> {
    const response = await fetch(
        `https://gateway.chub.ai/api/gallery/project/${id}`,
        {
            referrerPolicy: "no-referrer"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch gallery for project ${id}: ${(response.status, response.statusText)}`
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
export async function fetchCharacterImage(
    character: ChubCharacter
): Promise<Blob> {
    const response = await fetch(character.max_res_url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${character.fullPath}: ${(response.status, response.statusText)}`
        );
    }

    const blob = await response.blob();
    return blob;
}

export async function fetchCharacters(
    searchOptions: SearchOptions
): Promise<ChubCharacter[]> {
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
        searchParams.append(
            "inclusive_or",
            searchOptions.inclusiveOr.toString()
        );

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
        const apiKey = settings.apiKeys.chub || "";

        const response = await fetch(
            `https://gateway.chub.ai/search?${String(searchParams)}`,
            {
                headers: new Headers({
                    "CH-API-KEY": apiKey,
                    samwise: apiKey
                }),
                referrerPolicy: "no-referrer"
            }
        );

        if (!response.ok) {
            throw new Error(
                `chub API returned error: ${(response.status, response.statusText)}`
            );
        }

        const searchResults = await response.json();

        const characters: ChubCharacter[] = searchResults.data.nodes
            // .map((node: ChubCharacter) => ({
            //     ...node,
            //     tagline: sanitizeText(node.tagline)
            // }))
            .filter((character: ChubCharacter) => character !== null);

        return characters;
    } catch (error) {
        throw new Error("Error fetching characters", error as Error);
    }
}
