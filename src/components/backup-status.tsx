import { ExportDatabase } from "@/components/database-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { generateCuid2 } from "@/lib/utils";
import { createCollection, localStorageCollectionOptions, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlarmClock, AlarmClockOff, AlertTriangle, DatabaseBackup } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

const INTERVALS = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    biweekly: 14 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    never: Infinity
};

const BackupSettings = z.object({
    id: z.cuid2().default(generateCuid2),
    enabled: z.boolean().default(true),
    interval: z.enum(["daily", "weekly", "biweekly", "monthly", "never"]).default("weekly"),
    lastBackup: z.number().default(0),
    lastReminder: z.number().default(0),
    snoozeUntil: z.number().default(() => Date.now() + INTERVALS.weekly)
});
type BackupSettings = z.infer<typeof BackupSettings>;

const backupSettingsCollection = createCollection(
    localStorageCollectionOptions({
        id: "backup",
        storageKey: "backup-settings",
        getKey: (item) => item.id,
        schema: BackupSettings
    })
);

backupSettingsCollection.onFirstReady(() => {
    if (backupSettingsCollection.size === 0) {
        backupSettingsCollection.insert(BackupSettings.parse({}));
    }
});

interface Props {
    showDialogTrigger?: boolean;
}

export function BackupStatus({ showDialogTrigger = false }: Props) {
    const { data: settings } = useLiveQuery((query) =>
        query.from({ backupSettings: backupSettingsCollection }).findOne()
    );

    const { data: storageInfo } = useQuery({
        queryKey: ["storage"],
        queryFn: async () => {
            const estimate = await navigator.storage?.estimate();
            return {
                usage: estimate?.usage || 0,
                quota: estimate?.quota || 0,
                persisted: await navigator.storage?.persisted()
            };
        }
    });

    useEffect(() => {
        navigator.storage.persist().then((persisted) => {
            if (!persisted) console.warn("Storage persistence denied");
        });
    }, []);

    const [dialogOpen, setDialogOpen] = useState(false);

    const checkReminder = () => {
        if (!settings?.enabled) return;
        if (Date.now() < settings.snoozeUntil) return;
        if (Date.now() - settings.lastReminder < 60 * 60 * 1000) return;

        const intervalMs = INTERVALS[settings.interval];
        const timeSinceLastBackup = Date.now() - settings.lastBackup;

        if (timeSinceLastBackup >= intervalMs) {
            setDialogOpen(true);
            backupSettingsCollection.update(settings.id, (draft) => {
                draft.lastReminder = Date.now();
            });
        }
    };

    useEffect(() => {
        checkReminder();
        const interval = setInterval(checkReminder, 60 * 60 * 1000); // Check hourly

        const handleVisibilityChange = () => {
            if (!document.hidden) checkReminder();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const handleSnooze = () => {
        backupSettingsCollection.update(settings?.id, (draft) => {
            draft.snoozeUntil = Date.now() * INTERVALS.daily;
        });
        setDialogOpen(false);
        toast.info("Reminder Snoozed", {
            description: "We'll remind you again tomorrow"
        });
    };

    const handleDisable = () => {
        backupSettingsCollection.update(settings?.id, (draft) => {
            draft.enabled = false;
        });
        setDialogOpen(false);
        toast.error("Reminders Disabled", {
            description: "You won't receive backup reminders anymore. Your data is at risk."
        });
    };

    const handleIntervalChange = (interval: BackupSettings["interval"]) => {
        backupSettingsCollection.update(settings?.id, (draft) => {
            draft.interval = interval;
        });
    };

    return (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {showDialogTrigger && (
                <AlertDialogTrigger>
                    <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                        <DatabaseBackup />
                        Backup Settings
                    </Button>
                </AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle />
                        Backup Reminder
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {settings?.lastBackup
                            ? `It's been ${formatDistanceToNow(settings.lastBackup, { addSuffix: true })} since your last backup.`
                            : "You've never backed up your data!"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Select value={settings?.interval} onValueChange={handleIntervalChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Backup every..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Backup Daily</SelectItem>
                        <SelectItem value="weekly">Backup Weekly</SelectItem>
                        <SelectItem value="biweekly">Backup Bi-Weekly</SelectItem>
                        <SelectItem value="monthy">Backup Monthly</SelectItem>
                        <SelectItem value="never">Never Backup</SelectItem>
                    </SelectContent>
                </Select>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button type="button" variant="outline" onClick={handleSnooze}>
                            <AlarmClock />
                            Snooze
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            className="text-foreground"
                            onClick={handleDisable}
                        >
                            <AlarmClockOff />
                            Don't remind me again
                        </Button>
                    </AlertDialogAction>
                    <AlertDialogAction asChild>
                        <ExportDatabase size="default" />
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
