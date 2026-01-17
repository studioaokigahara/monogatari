import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import {
    createCollection,
    localStorageCollectionOptions,
    useLiveQuery,
    WritableDeep
} from "@tanstack/react-db";
import { toMerged } from "es-toolkit";

export const settingsCollection = createCollection(
    localStorageCollectionOptions({
        id: "settings",
        storageKey: "settings",
        getKey: () => "settings",
        schema: Settings
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

export function useSettings() {
    const { data } = useLiveQuery((query) => query.from({ settings: settingsCollection }));

    const updateSettings = (updater: (settings: WritableDeep<Settings>) => void) => {
        settingsCollection.update("settings", updater);
    };

    return { settings: data[0], updateSettings };
}
