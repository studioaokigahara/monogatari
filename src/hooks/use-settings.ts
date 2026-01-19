import { settingsCollection } from "@/database/collections/settings";
import { Settings } from "@/types/settings";
import { useLiveQuery, WritableDeep } from "@tanstack/react-db";

export function useSettings() {
    const { data } = useLiveQuery((query) => query.from({ settings: settingsCollection }));

    const updateSettings = (updater: (settings: WritableDeep<Settings>) => void) => {
        settingsCollection.update("settings", updater);
    };

    return { settings: data[0], updateSettings };
}
