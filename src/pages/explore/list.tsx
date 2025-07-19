import { useCallback, useEffect, useRef, useState } from "react";

import { ButtonState, type Character } from "@/types/chub";

import { CharacterCard } from "@/components/explore/card";
import CharacterPopup from "@/components/explore/popup";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface CharacterListProps {
    characters: Character[];
    characterPaths: Set<string>;
    buttonStates: Record<string, { state: ButtonState; error?: string }>;
    isLoading: boolean;
    onCharacterDownload: (job: Character) => void;
    onLoadMore: () => void;
    onTagClick: (tag: string) => void;
    onCreatorClick: (creator: string) => void;
}

export default function CharacterList({
    characters,
    characterPaths,
    buttonStates,
    isLoading,
    onCharacterDownload,
    onLoadMore,
    onTagClick,
    onCreatorClick
}: CharacterListProps) {
    const [selectedCharacter, setSelectedCharacter] =
        useState<Character | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && !isLoading) {
                    onLoadMore();
                }
            },
            {
                root: null,
                rootMargin: "100px",
                threshold: 0.1
            }
        );

        observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, [isLoading, onLoadMore]);

    const handleCharacterClick = useCallback(
        (character: Character) => {
            setSelectedCharacter(character);
            setIsDialogOpen(true);
        },
        [setSelectedCharacter, setIsDialogOpen]
    );

    const handleDownloadClick = useCallback(
        async (character: Character) => {
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

    return (
        <>
            <div
                ref={listRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-2 pb-4 px-0.5"
            >
                {characters.length === 0 && !isLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center h-64">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">
                            No characters found
                        </p>
                    </div>
                ) : (
                    characters.map((character, index) => (
                        <CharacterCard
                            key={`${character.fullPath}-${index}`}
                            character={character}
                            isDownloaded={characterPaths.has(
                                character.fullPath
                            )}
                            onCardClick={handleCharacterClick}
                            onDownloadClick={handleDownloadClick}
                            onCreatorClick={onCreatorClick}
                            onTagClick={onTagClick}
                            buttonState={
                                buttonStates[character.fullPath]?.state ??
                                (characterPaths.has(character.fullPath)
                                    ? ButtonState.READY_UPDATE
                                    : ButtonState.READY_DOWNLOAD)
                            }
                        />
                    ))
                )}
                {isLoading && (
                    <>
                        {[...Array(8)].map((_, index) => (
                            <Skeleton
                                key={index}
                                className="rounded-xl w-auto h-44 md:h-72"
                            />
                        ))}
                    </>
                )}
                <div ref={sentinelRef} className="col-span-full h-1" />
            </div>

            {selectedCharacter && (
                <CharacterPopup
                    openState={[isDialogOpen, setIsDialogOpen]}
                    character={selectedCharacter}
                    isDownloaded={characterPaths.has(
                        selectedCharacter.fullPath
                    )}
                    onDownloadClick={() => {
                        handleDownloadClick(selectedCharacter);
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
                        buttonStates[selectedCharacter.fullPath]?.state ??
                        ButtonState.READY_DOWNLOAD
                    }
                />
            )}
        </>
    );
}
