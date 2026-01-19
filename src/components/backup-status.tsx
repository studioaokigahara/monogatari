import { ExportDatabase } from "@/components/database-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BackupSettings, backupSettingsCollection } from "@/database/collections/backup-settings";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlarmClock, AlarmClockOff, AlertTriangle, DatabaseBackup } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const INTERVALS = {
    daily: 1000 * 60 * 60 * 24,
    weekly: 1000 * 60 * 60 * 24 * 7,
    biweekly: 1000 * 60 * 60 * 24 * 14,
    monthly: 1000 * 60 * 60 * 24 * 30,
    never: Infinity
};

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
        void navigator.storage.persist().then((persisted) => {
            if (!persisted) {
                console.warn("Storage persistence denied");
            }
        });
    }, []);

    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        const checkReminder = () => {
            if (!settings?.enabled) return;
            if (Date.now() < settings.snoozeUntil) return;
            if (Date.now() - settings.lastReminder < 60 * 60 * 1000) return;

            const intervalMs = INTERVALS[settings.interval];
            const timeSinceLastBackup = Date.now() - settings.lastBackup;

            if (timeSinceLastBackup >= intervalMs) {
                setDialogOpen(true);
                backupSettingsCollection.update("backup-settings", (draft) => {
                    draft.lastReminder = Date.now();
                });
            }
        };

        checkReminder();

        const interval = setInterval(checkReminder, 1000 * 60 * 60);

        const handleVisibilityChange = () => {
            if (!document.hidden) checkReminder();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [settings]);

    const handleSnooze = () => {
        backupSettingsCollection.update("backup-settings", (draft) => {
            draft.snoozeUntil = Date.now() * INTERVALS.daily;
        });
        toast.info("Reminder Snoozed", {
            description: "We'll remind you again tomorrow"
        });
    };

    const handleDisable = () => {
        backupSettingsCollection.update("backup-settings", (draft) => {
            draft.enabled = false;
        });
        toast.error("Reminders Disabled", {
            description: "You won't receive backup reminders anymore. Your data is at risk."
        });
    };

    const handleIntervalChange = (interval: BackupSettings["interval"]) => {
        backupSettingsCollection.update("backup-settings", (draft) => {
            draft.interval = interval;
        });
    };

    const handleCheckedChange = (checked: boolean) => {
        backupSettingsCollection.update("backup-settings", (settings) => {
            settings.enabled = checked;
        });
    };

    return (
        <>
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-1">
                            <AlertTriangle />
                            Backup Reminder
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {settings?.lastBackup
                                ? `It's been ${formatDistanceToNow(settings.lastBackup, { addSuffix: true })} since your last backup.`
                                : "You've never backed up your data!"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button type="button" variant="outline" onClick={handleSnooze}>
                                <AlarmClock />
                                Snooze
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogCancel asChild>
                            <Button
                                type="button"
                                variant="destructive"
                                className="text-foreground"
                                onClick={handleDisable}
                            >
                                <AlarmClockOff />
                                Don't remind me again
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <ExportDatabase size="default" />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog>
                {showDialogTrigger && (
                    <DialogTrigger>
                        <Button type="button" size="sm">
                            <DatabaseBackup />
                            Backup Settings
                        </Button>
                    </DialogTrigger>
                )}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-1">
                            <DatabaseBackup />
                            Backup Settings
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Change Backup Reminder Settings
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="justify-around!">
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
                        <Label htmlFor="reminders">
                            Reminders
                            <Switch
                                id="reminders"
                                checked={settings?.enabled}
                                onCheckedChange={handleCheckedChange}
                            />
                        </Label>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
