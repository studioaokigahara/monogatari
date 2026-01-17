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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { downloadFile } from "@/lib/utils";
import { ExportProgress } from "dexie-export-import";
import { ImportProgress } from "dexie-export-import/dist/import";
import { HardDriveDownload, HardDriveUpload } from "lucide-react";
import { DateTime } from "luxon";
import { useRef, useState } from "react";
import { toast } from "sonner";

function getOverallPercent(progress?: ExportProgress | ImportProgress) {
    const clamp = (n: number, min: number, max: number) => {
        return Math.min(max, Math.max(min, n));
    };

    const totalTables = progress?.totalTables ?? 0;
    if (totalTables <= 0) return 0;

    const completedTables = progress?.completedTables ?? 0;

    const totalRows = progress?.totalRows ?? 0;
    const completedRows = progress?.completedRows ?? 0;

    const rowFraction = totalRows > 0 ? clamp(completedRows / totalRows, 0, 1) : 0;

    const overall = (completedTables + rowFraction) / totalTables;

    return clamp(Math.round(overall * 100), 0, 100);
}

type WorkerMessage =
    | { type: "progress"; payload: ExportProgress }
    | { type: "exportDone"; payload: Blob | undefined }
    | { type: "importDone"; payload: null }
    | { type: "error"; payload: string };

interface ExportProps {
    size?: "default" | "sm";
}

export function ExportDatabase({ size = "sm" }: ExportProps) {
    const workerRef = useRef<Worker | null>(null);
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [done, setDone] = useState(false);
    const [progress, setProgress] = useState<ExportProgress>();

    const exportDB = async () => {
        if (exporting) {
            toast.error("Export already in progress.");
            return;
        }

        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL("@/lib/workers/database-io.worker.ts", import.meta.url),
                { type: "module" }
            );
        }

        setExporting(true);

        const worker = workerRef.current;

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { type, payload } = event.data;

            if (type === "progress") setProgress(payload);
            else if (type === "error") {
                toast.error("Failed to export database", {
                    description: payload
                });
            } else if (type === "exportDone") {
                const blob = payload;
                if (!blob) {
                    toast.error("Failed to export database", {
                        description: "Blob missing?"
                    });
                    return;
                }

                const file = new File(
                    [blob],
                    `monogatari-${DateTime.now().toFormat("yyyy-MM-dd")}.db`,
                    {
                        type: "application/json"
                    }
                );

                downloadFile(file);
                setExporting(false);
                setDone(true);
            }
        };

        worker.postMessage({
            type: "export",
            payload: {
                options: {
                    numRowsPerChunk: 1
                }
            }
        });
    };

    const handleAction = async (event: React.MouseEvent) => {
        event.preventDefault();
        if (done) {
            setExporting(false);
            setDone(false);
            setProgress(undefined);
            workerRef.current?.terminate();
            setOpen(false);
        } else {
            await exportDB();
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button size={size} onClick={() => setOpen(true)}>
                    <HardDriveUpload />
                    Export
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {exporting ? (
                            <span className="inline-flex items-center gap-1">
                                <Spinner className="size-6" />
                                Exporting Database...
                            </span>
                        ) : done ? (
                            "Database Exported"
                        ) : (
                            "Export Database"
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {exporting
                            ? `Exporting row ${progress?.completedRows ?? 0 + 1} of ${progress?.totalRows}...`
                            : done
                              ? "Finished exporting the database."
                              : "This operation will export the entire database to a file that will be saved to your computer. This may take a while, and depending on the number of assets, may produce a file that is multiple gigabytes. Continue?"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {exporting && <Progress value={getOverallPercent(progress)} />}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={exporting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={exporting} onClick={handleAction}>
                        {exporting ? "Exporting..." : done ? "Close" : "Continue"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function ImportDatabase() {
    const workerRef = useRef<Worker | null>(null);
    const [open, setOpen] = useState(false);
    const [replaceDatabase, setReplaceDatabase] = useState(false);
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(false);
    const [progress, setProgress] = useState<ExportProgress>();

    const importDB = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setOpen(true);

        if (importing) {
            toast.error("Import already in progress.");
            return;
        }

        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL("@/lib/workers/database-io.worker.ts", import.meta.url),
                { type: "module" }
            );
        }

        setImporting(true);

        const worker = workerRef.current;

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { type, payload } = event.data;

            if (type === "progress") setProgress(payload);
            else if (type === "error") {
                toast.error("Failed to import database", {
                    description: payload
                });
            } else if (type === "importDone") {
                setImporting(false);
                setDone(true);
            }
        };

        worker.postMessage({
            type: "import",
            payload: {
                blob: file,
                replace: replaceDatabase,
                options: {
                    overwriteValues: replaceDatabase ? true : false,
                    clearTablesBeforeImport: replaceDatabase ? true : false
                }
            }
        });
    };

    const { browse, input } = useFileDialog({
        accept: ".db",
        onChange: importDB
    });

    const handleAction = (event: React.MouseEvent) => {
        event.preventDefault();
        if (done) {
            setImporting(false);
            setReplaceDatabase(false);
            setDone(false);
            setProgress(undefined);
            workerRef.current?.terminate();
            setOpen(false);
        } else {
            browse();
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button size="sm" onClick={() => setOpen(true)}>
                    {input}
                    <HardDriveDownload />
                    Import
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center">
                        {importing ? (
                            <span className="inline-flex items-center gap-1">
                                <Spinner className="size-6" />
                                Importing Database...
                            </span>
                        ) : done ? (
                            "Database Imported"
                        ) : (
                            "Import Database"
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <Switch
                                id="replace-database"
                                disabled={importing}
                                checked={replaceDatabase}
                                onCheckedChange={setReplaceDatabase}
                            />
                            <Label htmlFor="replace-database">
                                {replaceDatabase ? "Mode: Replace" : "Mode: Merge"}
                            </Label>
                        </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {importing
                            ? `Importing row ${progress?.completedRows ?? 0 + 1} of ${progress?.totalRows}...`
                            : done
                              ? "Finished exporting the database."
                              : "This operation will import a database from the file you select, either replacing your existing database or merging the existing database with the contents of the file. This may take a while, depending on the number of assets. Continue?"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {importing && (
                    <Progress
                        value={Math.round(
                            ((progress?.completedRows ?? 0) / (progress?.totalRows ?? 0)) * 100
                        )}
                    />
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={importing} onClick={handleAction}>
                        {importing ? "Importing..." : done ? "Close" : "Continue"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
