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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import { Character, CharacterCardV3Asset } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { scanGallery } from "@/lib/character/scanner";
import { Check, ImageUp, Radar, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function GalleryScanner({ character }: { character: Character }) {
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
            }
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
                    <Button variant="outline" onClick={() => setOpen(true)}>
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

export default function Gallery({ character }: { character: Character }) {
    const [openIndex, setOpenIndex] = useState<number>();

    const imageURLs = useImageURL(
        character.data.assets.map((asset) => ({
            category: "character" as const,
            id: character.id,
            assets: character.data.assets,
            fileName: `${asset.name}.${asset.ext}`
        }))
    );

    const deleteAsset = async (index: number) => {
        const pointer = character.data.assets[index];
        const assetName = `${pointer.name}.${pointer.ext}`;
        const assetToDelete = await db.assets.get({
            "[parentID+file.name]": [character.id, assetName]
        });
        if (assetToDelete) {
            await assetToDelete.delete();
            const newAssets = character.data.assets.filter(
                (asset) => `${asset.name}.${asset.ext}` !== assetName
            );
            await character.update({
                assets: newAssets
            });
            setOpenIndex(undefined);
            toast.success(`Deleted ${assetName}`);
        }
    };

    const addToGallery = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const updateAssets = async () => {
            let pointers: CharacterCardV3Asset[] = [];
            for (const file of files) {
                const name = `gallery_${Date.now()}`;
                const ext =
                    file.name.split(".").pop() ?? file.type.split("/")[1];
                const fileName = `${name}.${ext}`;
                pointers.push({
                    type: "x_gallery",
                    uri: `embedded://${fileName}`,
                    name,
                    ext
                });
                const asset = new Asset({
                    category: "character",
                    parentID: character.id,
                    file: new File([file], fileName, { type: file.type })
                });
                await asset.save();
            }
            await character.update({
                assets: [...character.data.assets, ...pointers]
            });
        };

        toast.promise(updateAssets, {
            loading: "Uploading files...",
            success: `Files uploaded successfully!`,
            error: "Failed to upload files."
        });
    };

    const [copied, setCopied] = useState(false);
    const [copyIndex, setCopyIndex] = useState<number>();
    const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    const copyFilename = async (index: number) => {
        const asset = character.data.assets[index];
        await navigator.clipboard.writeText(
            `embedded://${asset.name}.${asset.ext}`
        );
        setCopied(true);
        setCopyIndex(index);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
            setCopied(false);
            setCopyIndex(undefined);
        }, 2000);
    };

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: true,
        onChange: addToGallery
    });

    const galleryImages = character.data.assets.map((asset, index) => (
        <figure key={index} className="content-center">
            <Dialog
                open={openIndex === index}
                onOpenChange={(open) => setOpenIndex(open ? index : undefined)}
            >
                <DialogTitle className="sr-only">{asset.name}</DialogTitle>
                <DialogDescription className="sr-only">
                    {asset.type}
                    {asset.name}
                    {asset.ext}
                </DialogDescription>
                <DialogTrigger asChild>
                    <img
                        src={imageURLs[index]}
                        alt={asset.name}
                        className="max-h-[50dvh] rounded-lg cursor-pointer"
                    />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[80dvw] w-max">
                    <img
                        src={imageURLs[index]}
                        alt={asset.name}
                        className="max-h-[80dvh] rounded-xl mx-auto"
                    />
                    {index !== 0 && (
                        <DialogFooter>
                            <Button
                                variant="destructive"
                                className="grow"
                                onClick={() => deleteAsset(index)}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
            <figcaption
                className="pt-2 text-xs text-muted-foreground"
                onClick={() => copyFilename(index)}
            >
                {copied && copyIndex === index ? (
                    <span className="flex flex-row gap-1">
                        <Check className="size-4 text-green-500" />
                        Copied!
                    </span>
                ) : (
                    <span className="cursor-copy">
                        {asset.name}.{asset.ext}
                    </span>
                )}
            </figcaption>
        </figure>
    ));

    return (
        <Card>
            <CardHeader className="flex flex-row-reverse gap-2">
                <GalleryScanner character={character} />
                <Button onClick={browse}>
                    {input}
                    <ImageUp />
                    Upload
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col space-y-4">
                <ScrollArea className="overflow-x-hidden">
                    <div className="flex shrink w-max space-x-4 mb-2">
                        {galleryImages}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
