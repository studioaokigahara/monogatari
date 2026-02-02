import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import z from "zod";

export const CharacterSearchSettings = z.object({
    limit: z.number().multipleOf(12).default(24),
    sort: z.enum(["a-z", "z-a", "newest", "oldest", "recent", "stale", "random"]).default("a-z")
});

export const searchCollectionKey = "character-search-settings";

export const searchSettingsCollection = createCollection(
    localStorageCollectionOptions({
        id: searchCollectionKey,
        storageKey: searchCollectionKey,
        getKey: () => searchCollectionKey,
        schema: CharacterSearchSettings,
        startSync: true
    })
);

searchSettingsCollection.onFirstReady(() => {
    if (!searchSettingsCollection.get(searchCollectionKey)) {
        searchSettingsCollection.insert(CharacterSearchSettings.parse({}));
    }
});
