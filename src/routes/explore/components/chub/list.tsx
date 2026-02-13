import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/database/monogatari-db";
import { importCharacter } from "@/lib/character/io";
import { scanGallery } from "@/lib/character/scanner";
import { fetchCharacterImage, fetchCharacterJSON } from "@/lib/explore/chub/api";
import { ChubCharacterItem } from "@/routes/explore/components/chub/item";
import { CharacterModal } from "@/routes/explore/components/chub/modal";
import { type ChubCharacter } from "@/types/explore/chub";
import { useMutation } from "@tanstack/react-query";
import { useLoaderData, useNavigate } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CharacterListProps {
    characters: ChubCharacter[];
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    onTagClick: (tag: string) => void;
}

export default function CharacterList({
    characters,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    onTagClick
}: CharacterListProps) {
    const [selectedCharacter, setSelectedCharacter] = useState<ChubCharacter>();
    const [modalOpen, setModalOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const preload = useLoaderData({ from: "/explore/chub" });
    const downloadedCharacters = useLiveQuery(() => db.characters.toArray(), [], preload);

    const characterPaths = new Set<string>(
        downloadedCharacters
            .filter((character) => character.data.extensions.chub?.full_path)
            .map((character) => character.data.extensions.chub?.full_path)
    );

    const navigate = useNavigate({ from: "/explore/chub" });

    const downloadMutation = useMutation({
        mutationFn: async (job: ChubCharacter) => {
            const isUpdate = characterPaths.has(job.fullPath);

            // we dont bother reading the image, chub stores latest JSON seperately
            // from the card and doesnt update the card itself until who knows when.
            // fetch the json and just use the image as main.png
            const json = await fetchCharacterJSON(job);
            const imageBlob = await fetchCharacterImage(job);
            const arrayBuffer = await imageBlob.arrayBuffer();

            const character = await importCharacter(json, arrayBuffer);

            await character.update({
                source: [...character.data.source, `https://chub.ai/characters/${job.fullPath}`],
                extensions: {
                    ...character.data.extensions,
                    monogatari: {
                        ...character.data.extensions.monogatari,
                        tagline: job.tagline
                    }
                }
            });

            toast.promise(scanGallery(character), {
                loading: `Scanning ${job.name} for images...`,
                success: ({ total, replaced }) => ({
                    message: "Scan completed successfully!",
                    description: `Downloaded ${total} images, and replaced ${replaced} URLs with embedded images.`
                }),
                error: (error: Error) => {
                    console.error("Gallery scan failed:", error);
                    return error.message;
                }
            });

            return { job, id: character.id, isUpdate };
        },
        onSuccess: ({ job, id, isUpdate }) => {
            toast.success(`${isUpdate ? "Updated" : "Downloaded"} ${job.name} successfully!`, {
                action: {
                    label: "Open",
                    onClick: () => {
                        void navigate({
                            to: "/characters/$id",
                            params: { id }
                        });
                    }
                }
            });
        },
        onError: (error: Error, job) => {
            console.error("Download failed for", job.fullPath, error);
            toast.error(`Download failed for ${job.name}:`, {
                description: error.message
            });
        }
    });

    const handleCharacterClick = (character: ChubCharacter) => {
        setSelectedCharacter(character);
        setModalOpen(true);
    };

    const handleDownloadClick = async (character: ChubCharacter) => {
        const isDownloaded = characterPaths.has(character.fullPath);

        if (isDownloaded) {
            setSelectedCharacter(character);
            setDialogOpen(true);
        } else {
            await downloadMutation.mutateAsync(character);
        }
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        setContainerWidth(container.clientWidth);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setContainerWidth(entry.contentRect.width);
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const virtualizer = useWindowVirtualizer({
        count: hasNextPage ? characters.length + 1 : characters.length,
        estimateSize: () => 222,
        overscan: 4,
        scrollMargin: containerRef.current?.offsetTop ?? 0,
        gap: 8,
        lanes: Math.max(1, Math.floor(containerWidth / 384))
    });

    const virtualItems = virtualizer.getVirtualItems();

    useEffect(() => {
        const [lastItem] = [...virtualItems].reverse();
        const isLastItem = lastItem?.index >= characters.length - 1;

        if (isLastItem && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [virtualItems, characters.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isFetching && !isFetchingNextPage) {
        return (
            <div ref={containerRef} className="relative my-2 w-full">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(384px,1fr))]">
                    {Array.from({ length: virtualizer.options.lanes * 4 }).map((_, index) => (
                        <Skeleton key={`skeleton-${index}`} className="h-55 w-auto rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (characters.length === 0 && !isFetching) {
        return (
            <div ref={containerRef} className="relative my-2 w-full">
                <div className="col-span-full flex h-64 flex-col items-center justify-center">
                    <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">No characters found</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ItemGroup
                ref={containerRef}
                className="my-2"
                style={{ height: virtualizer.getTotalSize() }}
            >
                {virtualItems.map((item) => {
                    const character = characters[item.index];
                    const { scrollMargin, gap, lanes } = virtualizer.options;
                    return character ? (
                        <ChubCharacterItem
                            key={character.id}
                            data-index={item.index}
                            character={character}
                            isDownloaded={characterPaths.has(character.fullPath)}
                            onCharacterClick={() => handleCharacterClick(character)}
                            onDownloadClick={() => handleDownloadClick(character)}
                            onTagClick={onTagClick}
                            style={{
                                position: "absolute",
                                left: `calc(${item.lane} * (100% + ${gap}px) / ${lanes})`,
                                width: `calc((100% - ${(lanes - 1) * gap}px) / ${lanes})`,
                                height: `${item.size}px`,
                                transform: `translateY(${item.start - scrollMargin}px)`
                            }}
                        />
                    ) : null;
                })}
            </ItemGroup>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Character</DialogTitle>
                        <DialogDescription>
                            This character is already downloaded. Would you like to update it?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                        <Button
                            onClick={() => {
                                downloadMutation.mutate(selectedCharacter!);
                                setDialogOpen(false);
                            }}
                        >
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedCharacter && (
                <CharacterModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    character={selectedCharacter!}
                    isDownloaded={characterPaths.has(selectedCharacter!.fullPath)}
                    onDownloadClick={handleDownloadClick}
                    onTagClick={onTagClick}
                />
            )}
        </>
    );
}
