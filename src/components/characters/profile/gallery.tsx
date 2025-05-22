import GalleryScanner from "@/components/characters/gallery-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { addAssets } from "@/database/characters";
import { db } from "@/database/database";
import { AssetRecord, CharacterRecord } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { ImageUp, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface GalleryProps {
    character: CharacterRecord;
}

export default function Gallery({ character }: GalleryProps) {
    const [assets, setAssets] = useState<AssetRecord[]>(character.assets);
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const imageBlobs = useMemo(
        () => assets.map((asset) => asset.blob),
        [assets],
    );
    const imageURLs = useImageURL(imageBlobs);

    const deleteAsset = async (index: number) => {
        if (index === 0) {
            toast.error(`You can't delete the main image, dummy.`);
        }

        const asset = assets[index];
        const updatedAssets = assets.filter((_, i) => i !== index);
        await db.characters.update(character.id, { assets: updatedAssets });
        setAssets(updatedAssets);
        setOpenIndex(null);
        toast.success(`Deleted ${asset.name}.${asset.ext}`);
    };

    const addToGallery = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        let assets: AssetRecord[] = [];
        for (const file of files) {
            assets.push({
                blob: new Blob([file]),
                type: "x_gallery",
                name: `gallery_${Date.now()}`,
                ext: file.type.split("/")[1],
            });
        }

        toast.promise(addAssets(character.id, assets), {
            loading: "Uploading files...",
            success: `Files uploaded to gallery successfully!`,
            error: "Failed to upload files.",
        });
    };

    const { browse, input } = useFileDialog({
        accept: ".png, .jpeg, .webp",
        multiple: true,
        onChange: addToGallery,
    });

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
                <ScrollArea className="max-w-4xl overflow-x-hidden">
                    <div className="flex shrink w-max space-x-4 mb-2">
                        {Array.from(assets).map((asset, index) => (
                            <figure key={index} className="content-center">
                                <Dialog
                                    open={openIndex === index}
                                    onOpenChange={(open) =>
                                        setOpenIndex(open ? index : null)
                                    }
                                >
                                    <DialogTitle className="sr-only">
                                        {asset.name}
                                    </DialogTitle>
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
                                    <DialogContent className="sm:max-w-fit">
                                        <img
                                            src={imageURLs[index]}
                                            alt={asset.name}
                                            className="max-h-[80dvh] h-full rounded-xl mx-auto"
                                        />
                                        {index !== 0 && (
                                            <DialogFooter>
                                                <Button
                                                    variant="destructive"
                                                    className="grow"
                                                    onClick={async () =>
                                                        await deleteAsset(index)
                                                    }
                                                >
                                                    <Trash2 />
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        )}
                                    </DialogContent>
                                </Dialog>
                                <figcaption className="pt-2 text-xs text-muted-foreground">
                                    {asset.name}.{asset.ext}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
