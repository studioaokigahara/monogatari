import type React from "react";

import { Prose } from "@/components/prose";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from "@/components/ui/dialog";
import { getButtonIcon, getButtonText } from "@/lib/explore/chub/utils";
import type { ButtonState, ChubCharacter } from "@/types/explore/chub";
import {
    Cake,
    CalendarClock,
    Download,
    Heart,
    Star,
    StarHalf,
    TextSelect
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TagList } from "@/components/tags";
import { cn } from "@/lib/utils";

interface CharacterPopupProps {
    character: ChubCharacter;
    openState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    buttonState: ButtonState;
    isDownloaded: boolean;
    onDownloadClick: () => void;
    onTagClick: (tag: string) => void;
    onCreatorClick: (creator: string) => void;
}

export default function CharacterPopup({
    character,
    openState,
    buttonState,
    isDownloaded,
    onDownloadClick,
    onTagClick,
    onCreatorClick
}: CharacterPopupProps) {
    const [isOpen, setIsOpen] = openState;

    const handleTagClick = (e: React.MouseEvent, tag: string) => {
        e.preventDefault();
        onTagClick(tag);
    };

    const handleCreatorClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onCreatorClick(character.fullPath.split("/")[0]);
    };

    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <Star
                    key={`star-${i}`}
                    fill="currentColor"
                    className="size-4 text-yellow-500"
                />
            );
        }

        if (hasHalfStar) {
            stars.push(
                <StarHalf key="half-star" className="h-4 w-4 text-yellow-400" />
            );
        }

        return stars;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTitle className="sr-only">Character Popup</DialogTitle>
            <DialogDescription className="sr-only">
                {character.name}
            </DialogDescription>
            <DialogContent
                className={cn(
                    "flex sm:max-w-[90%] max-h-[90%]",
                    isDownloaded && "ring-2 ring-green-500/50"
                )}
            >
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col md:basis-2/5 space-y-4 overflow-y-auto">
                        <div className="relative max-h-full self-center">
                            <Avatar className="size-full rounded-xl">
                                <AvatarImage
                                    src={character.max_res_url}
                                    alt={character.name}
                                    className="aspect-[unset] object-cover"
                                />
                                <AvatarFallback>
                                    <Skeleton />
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                variant="secondary"
                                className="absolute bottom-4 right-4 cursor-pointer"
                                onClick={onDownloadClick}
                            >
                                {getButtonIcon(buttonState)}
                                <span>{getButtonText(buttonState)}</span>
                            </Button>
                        </div>

                        <div className="flex flex-col space-y-2 text-sm">
                            <div className="flex items-center gap-1">
                                <Cake className="size-4" />
                                <span>
                                    Created{" "}
                                    {new Date(
                                        character.createdAt
                                    ).toLocaleDateString()}{" "}
                                    by{" "}
                                    <button
                                        className="font-bold cursor-pointer hover:underline"
                                        onClick={handleCreatorClick}
                                    >
                                        @{character.fullPath.split("/")[0]}
                                    </button>
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <CalendarClock className="size-4" />
                                <span>
                                    Last Updated{" "}
                                    {new Date(
                                        character.lastActivityAt
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1">
                                    {renderStars(character.rating)}
                                    <span>{character.ratingCount} ratings</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Heart
                                        fill="hotpink"
                                        className="size-4 text-[hotpink]"
                                    />
                                    <span>
                                        {character.n_favorites} favorites
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Download className="size-4" />
                                    <span>{character.starCount} downloads</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <TextSelect className="size-4" />
                                    <span>{character.nTokens} tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:basis-3/5 space-y-4 overflow-y-scroll">
                        <div>
                            <h2 className="text-2xl font-bold">
                                <a
                                    href={`https://www.chub.ai/characters/${character.fullPath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    {character.name}
                                </a>
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-4">
                            <TagList
                                tags={character.topics}
                                onTagClick={handleTagClick}
                            />
                        </div>

                        <p className="font-semibold mb-2">
                            {character.tagline}
                        </p>
                        <hr className="my-2" />
                        <Prose>{character.description}</Prose>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
