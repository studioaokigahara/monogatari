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
import { Asset } from "@/database/schema/asset";
import { Character, CharacterCardV3Asset } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { scanGallery } from "@/lib/character/scanner";
import { downloadFile, generateCuid2, getFileExtension } from "@/lib/utils";
import { Check, ImageDown, ImageUp, Radar, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function GalleryScanner({ character }: { character: Character }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const appendLog = (newLine: string) => setLog((line) => [...line, newLine]);

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
    const handleAction = async () => {
        if (done) setOpen(false);
        else await handleScan();
    };

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger
                    onClick={() => setOpen(true)}
                    render={<Button variant="outline" />}
                >
                    <Radar />
                    Scan for Images
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
                        <code className="mb-4 h-48 overflow-y-auto p-2 text-sm">
                            {log.map((line) => (
                                <div key={line}>{line}</div>
                            ))}
                        </code>
                    )}
                    {total > 0 && (
                        <Progress value={current} max={total} className="mx-auto w-4/5" />
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={loading} onClick={handleAction}>
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
            filename: `${asset.name}.${asset.ext}`
        }))
    );

    const deleteAsset = async (index: number) => {
        const pointer = character.data.assets[index];
        const assetName = `${pointer.name}.${pointer.ext}`;
        const assetToDelete = await Asset.load(character.id, assetName);
        await assetToDelete.delete();
        const newAssets = character.data.assets.filter(
            (asset) => `${asset.name}.${asset.ext}` !== assetName
        );
        await character.update({
            assets: newAssets
        });
        setOpenIndex(undefined);
        toast.success(`Deleted ${assetName}`);
    };

    const addToGallery = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const updateAssets = async () => {
            let pointers: CharacterCardV3Asset[] = [];
            let assets: Asset[] = [];
            for (const file of files) {
                const name = `gallery_${generateCuid2()}`;
                const ext = getFileExtension(file.name);
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
                assets.push(asset);
            }
            await Promise.all(assets.map((asset) => asset.save()));
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
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    const copyFilename = async (index: number) => {
        const asset = character.data.assets[index];
        await navigator.clipboard.writeText(`embedded://${asset.name}.${asset.ext}`);
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

    const downloadAsset = async (index: number) => {
        const pointer = character.data.assets[index];
        const filename = `${pointer.name}.${pointer.ext}`;
        const asset = await Asset.load(character.id, filename);
        downloadFile(asset.file);
    };

    const galleryImages = character.data.assets.map((asset, index) => (
        <figure key={asset.name} className="content-center">
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
                <DialogTrigger
                    nativeButton={false}
                    render={
                        <img
                            src={imageURLs[index]}
                            alt={asset.name}
                            className="max-h-[50dvh] cursor-pointer rounded-lg"
                        />
                    }
                />
                <DialogContent className="w-max sm:max-w-[80dvw]">
                    <img
                        src={imageURLs[index]}
                        alt={asset.name}
                        className="mx-auto max-h-[80dvh] rounded-xl"
                    />
                    <DialogFooter>
                        <Button onClick={() => downloadAsset(index)}>
                            <ImageDown />
                            Download
                        </Button>
                        {index !== 0 && (
                            <Button variant="destructive" onClick={() => deleteAsset(index)}>
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <figcaption className="pt-2">
                <Button
                    variant="link"
                    size="sm"
                    className="cursor-copy px-0 text-xs font-medium text-muted-foreground"
                    disabled={copied && copyIndex === index}
                    onClick={() => copyFilename(index)}
                >
                    {copied && copyIndex === index ? (
                        <>
                            <Check className="text-green-500" />
                            Copied!
                        </>
                    ) : (
                        `${asset.name}.${asset.ext}`
                    )}
                </Button>
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
            <CardContent className="overflow-hidden px-0">
                <ScrollArea>
                    <div className="flex w-max shrink items-end gap-4 px-6 pb-4">
                        {galleryImages}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
