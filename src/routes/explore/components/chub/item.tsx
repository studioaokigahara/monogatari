import { TagList } from "@/components/tag-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemHeader,
    ItemMedia,
    ItemTitle
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";
import { type ChubCharacter } from "@/types/explore/chub";
import { Heart } from "lucide-react";

interface Props {
    character: ChubCharacter;
    isDownloaded: boolean;
    onCardClick: (character: ChubCharacter) => void;
    onDownloadClick: (character: ChubCharacter) => Promise<void>;
    onCreatorClick: (creator: string) => void;
    onTagClick: (tag: string) => void;
}

export function ChubCharacterItem({
    character,
    isDownloaded,
    onCardClick,
    onDownloadClick,
    onCreatorClick,
    onTagClick
}: Props) {
    const handleCardClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onCardClick(character);
    };

    const handleDownloadClick = async () => {
        await onDownloadClick(character);
    };

    const handleCreatorClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onCreatorClick(character.fullPath.split("/")[0]);
    };

    const handleTagClick = (event: React.MouseEvent, tag: string) => {
        event.stopPropagation();
        onTagClick(tag);
    };

    const buttonState = isDownloaded ? "ready_update" : "ready_download";

    return (
        <Item
            variant="muted"
            className={cn("overflow-hidden", isDownloaded && "ring-2 ring-green-500/50")}
        >
            <ItemHeader>
                <ItemMedia className="mx-auto">
                    <Avatar className="size-59 overflow-visible">
                        <AvatarImage
                            src={character.avatar_url}
                            className="absolute scale-150 blur-xl"
                        />
                        <AvatarImage
                            src={character.avatar_url}
                            alt={character.name}
                            className="rounded-md cursor-pointer z-1"
                            onClick={handleCardClick}
                        />
                        <AvatarFallback className="rounded-xl">
                            <Skeleton />
                        </AvatarFallback>
                    </Avatar>
                </ItemMedia>
            </ItemHeader>
            <ItemContent className="z-1">
                <div className="flex flex-col">
                    <ItemTitle
                        className="font-semibold leading-none cursor-pointer hover:underline"
                        onClick={handleCardClick}
                    >
                        {character.name}
                    </ItemTitle>
                    <div className="flex justify-between text-muted-foreground">
                        <span
                            role="button"
                            className="cursor-pointer hover:underline"
                            onClick={handleCreatorClick}
                        >
                            @{character.fullPath.split("/")[0]}
                        </span>
                        <span className="flex gap-1">
                            <Heart fill="hotpink" className="size-4 mt-px text-[hotpink]" />
                            {character.n_favorites}
                        </span>
                    </div>
                </div>
                <ItemDescription className="text-foreground line-clamp-4">
                    {character.tagline}
                </ItemDescription>
            </ItemContent>
            <ItemFooter className="flex-col">
                <TagList
                    tags={character.topics}
                    className="hover:bg-secondary cursor-pointer"
                    onTagClick={handleTagClick}
                />
            </ItemFooter>
            <ItemActions className="w-full">
                <DownloadButton
                    initialState={buttonState}
                    onClick={handleDownloadClick}
                    variant="outline"
                    size="sm"
                    className="w-full backdrop-blur"
                />
            </ItemActions>
        </Item>
    );
}
