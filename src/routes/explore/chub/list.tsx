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
import { cn } from "@/lib/utils";
import { ChubCharacterItem } from "@/routes/explore/components/chub/item";
import CharacterPopup from "@/routes/explore/components/chub/popup";
import { ButtonState, type ChubCharacter } from "@/types/explore/chub";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface CharacterListProps {
    characters: ChubCharacter[];
    characterPaths: Set<string>;
    buttonStates: Record<string, { state: ButtonState; error?: string }>;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    onCharacterDownload: (job: ChubCharacter) => void;
    onTagClick: (tag: string) => void;
    onCreatorClick: (creator: string) => void;
}

export default function CharacterList({
    characters,
    characterPaths,
    buttonStates,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    onCharacterDownload,
    onTagClick,
    onCreatorClick
}: CharacterListProps) {
    const [selectedCharacter, setSelectedCharacter] = useState<ChubCharacter>();
    const [popupOpen, setPopupOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleCharacterClick = (character: ChubCharacter) => {
        setSelectedCharacter(character);
        setPopupOpen(true);
    };

    const handleDownloadClick = async (character: ChubCharacter) => {
        const isDownloaded = characterPaths.has(character.fullPath);

        if (isDownloaded) {
            setSelectedCharacter(character);
            setDialogOpen(true);
        } else {
            onCharacterDownload(character);
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

    const virtualizer = useWindowVirtualizer({
        count: hasNextPage ? rowCount + 1 : rowCount,
        estimateSize: () => 448,
        overscan: 4,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
        gap: 8
    });

    const virtualItems = virtualizer.getVirtualItems();

    useEffect(() => {
        const [lastRow] = [...virtualItems].reverse();
        const isLastRow = lastRow?.index >= rowCount;

        if (isLastRow && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [
        virtualItems,
        rowCount,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage
    ]);

    if (isFetching && !isFetchingNextPage) {
        return (
            <div ref={gridRef} className="w-full relative pt-2 pb-4 my-2">
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(256px,1fr))] gap-2">
                    {[...Array(columnCount * 4)].map((_, index) => (
                        <Skeleton
                            key={index}
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
                    <p className="text-lg text-muted-foreground">
                        No characters found
                    </p>
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

                            const isDownloaded = characterPaths.has(
                                character.fullPath
                            );

                            const buttonState =
                                buttonStates[character.fullPath]?.state ??
                                (isDownloaded
                                    ? ButtonState.READY_UPDATE
                                    : ButtonState.READY_DOWNLOAD);

                            return (
                                <ChubCharacterItem
                                    key={character.id}
                                    character={character}
                                    isDownloaded={isDownloaded}
                                    onCardClick={handleCharacterClick}
                                    onDownloadClick={handleDownloadClick}
                                    onCreatorClick={onCreatorClick}
                                    onTagClick={onTagClick}
                                    buttonState={buttonState}
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
                            This character is already downloaded. Would you like
                            to update it?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={() =>
                                onCharacterDownload(selectedCharacter!)
                            }
                        >
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedCharacter && (
                <CharacterPopup
                    openState={[popupOpen, setPopupOpen]}
                    character={selectedCharacter!}
                    isDownloaded={characterPaths.has(
                        selectedCharacter!.fullPath
                    )}
                    onDownloadClick={async () => {
                        await handleDownloadClick(selectedCharacter!);
                        setPopupOpen(false);
                    }}
                    onTagClick={(tag) => {
                        onTagClick(tag);
                        setPopupOpen(false);
                    }}
                    onCreatorClick={(creator) => {
                        onCreatorClick(creator);
                        setPopupOpen(false);
                    }}
                    buttonState={
                        buttonStates[selectedCharacter!.fullPath]?.state ??
                        ButtonState.READY_DOWNLOAD
                    }
                />
            )}
        </>
    );
}
