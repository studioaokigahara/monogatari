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
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BackupSettings, backupSettingsCollection } from "@/database/collections/backup-settings";
import { useLiveQuery } from "@tanstack/react-db";
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

const BACKUP_OPTIONS = [
    { value: "daily", label: "Backup Daily" },
    { value: "weekly", label: "Backup Weekly" },
    { value: "biweekly", label: "Backup Bi-Weekly" },
    { value: "monthly", label: "Backup Monthly" },
    { value: "never", label: "Never Backup" }
];

interface Props {
    showDialogTrigger?: boolean;
}

export function BackupStatus({ showDialogTrigger = false }: Props) {
    const { data: settings } = useLiveQuery((query) =>
        query.from({ backupSettings: backupSettingsCollection }).findOne()
    );

    // const { data: storageInfo } = useQuery({
    //     queryKey: ["storage"],
    //     queryFn: async () => {
    //         const estimate = await navigator.storage?.estimate();
    //         return {
    //             usage: estimate?.usage || 0,
    //             quota: estimate?.quota || 0,
    //             persisted: await navigator.storage?.persisted()
    //         };
    //     }
    // });

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
            draft.snoozeUntil = Date.now() + INTERVALS.daily;
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

    const selectItems = BACKUP_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.value === "never" ? <AlarmClockOff /> : <AlarmClock />}
            {option.label}
        </SelectItem>
    ));

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
                        <AlertDialogCancel
                            onClick={handleSnooze}
                            render={<Button type="button" variant="outline" />}
                        >
                            <AlarmClock />
                            Snooze
                        </AlertDialogCancel>
                        <AlertDialogCancel
                            onClick={handleDisable}
                            render={
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="text-foreground"
                                />
                            }
                        >
                            <AlarmClockOff />
                            Don't remind me again
                        </AlertDialogCancel>
                        <AlertDialogAction render={<ExportDatabase />} />
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog>
                {showDialogTrigger && (
                    <DialogTrigger>
                        <Button type="button">
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
                        <Select
                            value={settings?.interval}
                            onValueChange={(value) => {
                                handleIntervalChange(value as keyof typeof INTERVALS);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Backup every...">
                                    {(value) => {
                                        const item = BACKUP_OPTIONS.find(
                                            (option) => option.value === value
                                        );
                                        return (
                                            <span className="flex items-center gap-1.5">
                                                {item?.value === "never" ? (
                                                    <AlarmClockOff />
                                                ) : (
                                                    <AlarmClock />
                                                )}
                                                {item?.label}
                                            </span>
                                        );
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>{selectItems}</SelectGroup>
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
