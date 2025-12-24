import {
    CharacterArchiveQuery,
    CharacterArchiveResponse
} from "@/types/explore/charchive";

const PROXY_URL = "https://api.allorigins.win/raw?url=";
const BASE_URL = `https://char-archive.evulid.cc/api/archive/v3/search/query?`;

export async function fetchCharacterArchiveItems(query: CharacterArchiveQuery) {
    const parsedQuery = CharacterArchiveQuery.parse(query);
    const searchParams = new URLSearchParams();

    searchParams.append("query", parsedQuery.query);
    searchParams.append("page", String(parsedQuery.page));
    searchParams.append("count", String(parsedQuery.count));
    if (parsedQuery.comparison) {
        searchParams.append("comparison", parsedQuery.comparison);
    }

    const encodedURL = encodeURIComponent(`${BASE_URL}${String(searchParams)}`);
    const response = await fetch(`${PROXY_URL}${encodedURL}`);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch from Character Archive: ${response.status} ${response.statusText}`
        );
    }

    const json: CharacterArchiveResponse = await response.json();
    return json.result;
}
