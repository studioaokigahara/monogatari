import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";

import { ButtonState, type ChubCharacter } from "@/types/explore/chub";

import { ChubCharacterItem } from "@/routes/explore/components/chub/item";
import CharacterPopup from "@/routes/explore/components/chub/popup";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ItemGroup } from "@/components/ui/item";

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
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleCharacterClick = useCallback(
        (character: ChubCharacter) => {
            setSelectedCharacter(character);
            setIsDialogOpen(true);
        },
        [setSelectedCharacter, setIsDialogOpen]
    );

    const handleDownloadClick = useCallback(
        async (character: ChubCharacter) => {
            const isDownloaded = characterPaths.has(character.fullPath);

            if (isDownloaded) {
                const confirmed = window.confirm(
                    "This character is already downloaded. Would you like to update it?"
                );
                if (!confirmed) return;
            }

            onCharacterDownload(character);
        },
        [characterPaths, onCharacterDownload]
    );

    const gridRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(0);

    useLayoutEffect(() => {
        if (!gridRef.current) return;
        const grid = gridRef.current;
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
        gap: 8,
        measureElement: (element, _entry, instance) => {
            if (
                instance.scrollDirection === "forward" ||
                instance.scrollDirection === null
            ) {
                return (element as HTMLElement)["offsetHeight"];
            }
            const index = Number(element.getAttribute("data-index"));
            const cachedMeasurement = instance.measurementsCache[index]?.size;
            return (
                cachedMeasurement || (element as HTMLElement)["offsetHeight"]
            );
        }
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

            {selectedCharacter && (
                <CharacterPopup
                    openState={[isDialogOpen, setIsDialogOpen]}
                    character={selectedCharacter!}
                    isDownloaded={characterPaths.has(
                        selectedCharacter!.fullPath
                    )}
                    onDownloadClick={() => {
                        handleDownloadClick(selectedCharacter!);
                        setIsDialogOpen(false);
                    }}
                    onTagClick={(tag) => {
                        onTagClick(tag);
                        setIsDialogOpen(false);
                    }}
                    onCreatorClick={(creator) => {
                        onCreatorClick(creator);
                        setIsDialogOpen(false);
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
