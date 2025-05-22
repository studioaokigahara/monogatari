import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CharacterRecord } from "@/database/schema/character";
import { scanGallery } from "@/lib/character/scanner";
import { Radar } from "lucide-react";
import { useState } from "react";

interface GalleryScannerProps {
    character: CharacterRecord;
}

export default function GalleryScanner({ character }: GalleryScannerProps) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const appendLog = (line: string) => setLog((l) => [...l, line]);

    async function handleScan() {
        setLoading(true);
        setDone(false);
        setLog([]);
        setCurrent(0);
        setTotal(0);

        await scanGallery(character, {
            onLog: appendLog,
            onProgress: (current, total) => {
                setTotal(total);
                setCurrent(current);
            },
        });

        setLoading(false);
        setDone(true);
    }

    const label = loading ? "Scanning…" : done ? "Close" : "Continue";
    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (done) setOpen(false);
        else await handleScan();
    };

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" onClick={() => setOpen(true)}>
                        <Radar /> Scan for Images
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Download Images?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {loading
                                ? `Downloading ${current} of ${total}...`
                                : log.length > 0
                                  ? "Finished. See log below:"
                                  : `This will scan all character fields and the character's chub.ai page for images. This may take a while. Continue?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {log.length > 0 && (
                        <code className="h-48 overflow-y-auto text-sm p-2 mb-4">
                            {log.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </code>
                    )}
                    {total > 0 && (
                        <Progress
                            value={current}
                            max={total}
                            className="w-4/5 mx-auto"
                        />
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={loading}
                            onClick={handleAction}
                        >
                            {label}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
