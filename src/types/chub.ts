export enum ButtonState {
    READY_DOWNLOAD = "ready_download",
    READY_UPDATE = "ready_update",
    IN_QUEUE = "in_queue",
    DOWNLOADING = "downloading",
    DONE = "done",
    ERROR = "error",
}

export interface Character {
    image: string;
    avatar: string;
    description: string;
    tagline: string;
    name: string;
    fullPath: string;
    tags: string[];
    creator: string;
    downloadCount: number;
    lastActivityAt: string;
    createdAt: string;
    numTokens: number;
    numfavorites: number;
    rating: number;
    numRatings: number;
    buttonState?: ButtonState;
    errorMessage?: string;
}

export interface SearchOptions {
    searchTerm: string;
    creator: string;
    namespace: string;
    includedTags: string[];
    excludedTags: string[];
    nsfw: boolean;
    itemsPerPage: number;
    sort: string;
    sortAscending: boolean;
    page: number;
}
