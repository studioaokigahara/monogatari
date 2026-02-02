import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { toMerged } from "es-toolkit";

export const settingsCollection = createCollection(
    localStorageCollectionOptions({
        id: "settings",
        storageKey: "settings",
        getKey: () => "settings",
        schema: Settings,
        startSync: true
    })
);

settingsCollection.onFirstReady(() => {
    if (settingsCollection.size === 0) {
        settingsCollection.insert(DEFAULT_SETTINGS);
    }
});

settingsCollection.once("status:ready", () => {
    const settings = settingsCollection.get("settings");
    if (settings) {
        const parsed = Settings.parse(settings);
        const merged = toMerged(DEFAULT_SETTINGS, parsed);
        settingsCollection.update("settings", (settings) => {
            Object.assign(settings, merged);
        });
    }
});
