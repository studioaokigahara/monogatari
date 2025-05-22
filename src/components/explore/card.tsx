import React, { useEffect, useState } from "react";

import { getButtonIcon, getButtonText } from "@/lib/chub/utils";
import { ButtonState, Character } from "@/types/chub";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { TagList } from "../tags";
import { Skeleton } from "../ui/skeleton";

interface CharacterImageProps {
    character: Character;
    onCardClick: () => void;
}

function CharacterImage({ character, onCardClick }: CharacterImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
    }, [character]);

    return (
        <>
            <img
                src={character.avatar}
                alt={character.name}
                className={`aspect-1/1 rounded-xl cursor-pointer ${imageLoaded ? "block" : "hidden"}`}
                // className={`size-[200px] rounded-xl cursor-pointer transition-discrete transition-opacity ${imageLoaded ? "block opacity-100" : "hidden opacity-0"}`}
                onClick={onCardClick}
                onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && <Skeleton className="size-[200px] rounded-xl" />}
        </>
    );
}

interface CharacterCardProps {
    character: Character;
    buttonState: ButtonState;
    isDownloaded: boolean;
    onCardClick: () => void;
    onDownloadClick: () => void;
    onCreatorClick: (creator: string) => void;
    onTagClick: (tag: string) => void;
}

function _CharacterCard({
    character,
    isDownloaded,
    onCardClick,
    onDownloadClick,
    onCreatorClick,
    onTagClick,
    buttonState,
}: CharacterCardProps) {
    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownloadClick();
    };

    const handleCreatorClick = (e: React.MouseEvent, creator: string) => {
        e.stopPropagation();
        onCreatorClick(creator);
    };

    const handleTagClick = (e: React.MouseEvent, tag: string) => {
        e.stopPropagation();
        onTagClick(tag);
    };

    const highlightClass = isDownloaded ? "ring-2 ring-green-500/50" : "";

    return (
        <Card
            className={`flex flex-row md:flex-col gap-2 md:gap-0 p-4 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/50 ${highlightClass}`}
        >
            <div className="relative mx-auto mb-2">
                <CharacterImage
                    character={character}
                    onCardClick={onCardClick}
                />
                <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 cursor-pointer"
                    onClick={handleDownloadClick}
                >
                    {getButtonIcon(buttonState)}
                    <span>{getButtonText(buttonState)}</span>
                </Button>
            </div>

            <CardContent className="p-0 max-w-3/5 md:max-w-full">
                <h3
                    className="font-bold text-lg truncate hover:underline cursor-pointer"
                    onClick={onCardClick}
                >
                    {character.name}
                </h3>

                <div className="flex flex-wrap items-center justify-between mb-1">
                    <span
                        className="text-sm text-muted-foreground hover:underline cursor-pointer"
                        onClick={(e) =>
                            handleCreatorClick(e, character.creator)
                        }
                    >
                        @{character.creator}
                    </span>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Heart
                            fill="hotpink"
                            className="size-4 text-[hotpink] mr-1"
                        />
                        <span>{character.numfavorites}</span>
                    </div>
                </div>

                <p className="text-sm line-clamp-4 mb-2">{character.tagline}</p>

                <TagList
                    variant="outline"
                    tags={character.tags}
                    className="hover:bg-secondary cursor-pointer"
                    onTagClick={handleTagClick}
                />
            </CardContent>
        </Card>
    );
}

export const CharacterCard = React.memo(_CharacterCard);
