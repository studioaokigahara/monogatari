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
import { cn } from "@/lib/utils";
import { ChubCharacterItem } from "@/routes/explore/components/chub/item";
import { CharacterModal } from "@/routes/explore/components/chub/modal";
import { type ChubCharacter } from "@/types/explore/chub";
import { useMutation } from "@tanstack/react-query";
import { useElementScrollRestoration, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface CharacterListProps {
    characters: ChubCharacter[];
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    onTagClick: (tag: string) => void;
    onCreatorClick: (creator: string) => void;
}

export default function CharacterList({
    characters,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    onTagClick,
    onCreatorClick
}: CharacterListProps) {
    const [selectedCharacter, setSelectedCharacter] = useState<ChubCharacter>();
    const [modalOpen, setModalOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const preload = useLoaderData({ from: "/explore/chub" });
    const downloadedCharacters = useLiveQuery(() => db.characters.toArray(), [], preload);

    const characterPaths = useMemo(() => {
        const paths = new Set<string>();

        if (downloadedCharacters.length === 0) return paths;

        downloadedCharacters
            .filter((character) => character.data.extensions.chub?.full_path)
            .forEach((character) => paths.add(character.data.extensions.chub?.full_path));

        if (paths.size === 0) {
            toast.warning(
                "No chub info found in database. Character download button states will be broken."
            );
        }

        return paths;
    }, [downloadedCharacters]);

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

    const gridRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(0);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        setGridWidth(grid.clientWidth);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setGridWidth(entry.contentRect.width);
            }
        });

        observer.observe(grid);

        return () => observer.disconnect();
    }, []);

    const columnCount = Math.max(1, Math.floor(gridWidth / 256));
    const rowCount = Math.max(0, Math.ceil(characters.length / columnCount));

    const scrollEntry = useElementScrollRestoration({
        getElement: () => window
    });

    const virtualizer = useWindowVirtualizer({
        count: hasNextPage ? rowCount + 1 : rowCount,
        estimateSize: () => 448,
        overscan: 4,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
        gap: 8,
        initialOffset: scrollEntry?.scrollY
    });

    const virtualItems = virtualizer.getVirtualItems();

    useEffect(() => {
        const [lastRow] = [...virtualItems].reverse();
        const isLastRow = lastRow?.index >= rowCount;

        if (isLastRow && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [virtualItems, rowCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isFetching && !isFetchingNextPage) {
        return (
            <div ref={gridRef} className="w-full relative pt-2 pb-4 my-2">
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(256px,1fr))] gap-2">
                    {[...Array(columnCount * 4)].map((_, index) => (
                        <Skeleton
                            key={`skeleton-${index}`}
                            className="rounded-xl w-auto h-44 md:h-96"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (characters.length === 0 && !isFetching) {
        return (
            <div ref={gridRef} className="w-full relative pt-2 pb-4 my-2">
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">No characters found</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={gridRef}
                className="w-full relative pt-2 pb-4 my-2"
                style={{ height: virtualizer.getTotalSize() }}
            >
                {virtualItems.map((row) => (
                    <ItemGroup
                        key={row.key}
                        data-index={row.index}
                        ref={virtualizer.measureElement}
                        className={cn(
                            "w-full absolute top-0 left-0",
                            "grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(256px,1fr))] gap-2"
                        )}
                        style={{
                            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`
                        }}
                    >
                        {[...Array(columnCount)].map((_, index) => {
                            const idx = row.index * columnCount + index;
                            const character = characters[idx];

                            if (!character) return null;

                            const isDownloaded = characterPaths.has(character.fullPath);

                            return (
                                <ChubCharacterItem
                                    key={character.id}
                                    character={character}
                                    isDownloaded={isDownloaded}
                                    onCardClick={handleCharacterClick}
                                    onDownloadClick={handleDownloadClick}
                                    onCreatorClick={onCreatorClick}
                                    onTagClick={onTagClick}
                                />
                            );
                        })}
                    </ItemGroup>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Character</DialogTitle>
                        <DialogDescription>
                            This character is already downloaded. Would you like to update it?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
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
                    openState={[modalOpen, setModalOpen]}
                    character={selectedCharacter!}
                    isDownloaded={characterPaths.has(selectedCharacter!.fullPath)}
                    onDownloadClick={handleDownloadClick}
                    onTagClick={onTagClick}
                    onCreatorClick={onCreatorClick}
                />
            )}
        </>
    );
}
