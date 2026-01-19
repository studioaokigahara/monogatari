import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import z from "zod";

const BackupSettings = z.object({
    enabled: z.boolean().default(true),
    interval: z.enum(["daily", "weekly", "biweekly", "monthly", "never"]).default("weekly"),
    lastBackup: z.number().default(0),
    lastReminder: z.number().default(0),
    snoozeUntil: z.number().default(() => Date.now() + 1000 * 60 * 60 * 24 * 7)
});
export type BackupSettings = z.infer<typeof BackupSettings>;

export const backupSettingsCollection = createCollection(
    localStorageCollectionOptions({
        id: "backup-settings",
        storageKey: "backup-settings",
        getKey: () => "backup-settings",
        schema: BackupSettings
    })
);

backupSettingsCollection.onFirstReady(() => {
    if (!backupSettingsCollection.get("backup-settings")) {
        backupSettingsCollection.insert(BackupSettings.parse({}));
    }
});
