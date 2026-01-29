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
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";
import { type ChubCharacter } from "@/types/explore/chub";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

interface Props {
    character: ChubCharacter;
    isDownloaded: boolean;
    onCardClick: (character: ChubCharacter) => void;
    onDownloadClick: (character: ChubCharacter) => Promise<void>;
    onTagClick: (tag: string) => void;
}

export function ChubCharacterItem({
    character,
    isDownloaded,
    onCardClick,
    onDownloadClick,
    onTagClick
}: Props) {
    const handleCardClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onCardClick(character);
    };

    const handleDownloadClick = async () => {
        await onDownloadClick(character);
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
                    <Avatar className="size-59 overflow-visible rounded-md after:rounded-md">
                        <AvatarImage
                            src={character.avatar_url}
                            className="absolute scale-150 blur-xl"
                        />
                        <AvatarImage
                            src={character.avatar_url}
                            alt={character.name}
                            className="z-1 cursor-pointer rounded-md"
                            onClick={handleCardClick}
                        />
                        <AvatarFallback className="animate-pulse rounded-md" />
                    </Avatar>
                </ItemMedia>
            </ItemHeader>
            <ItemContent className="z-1">
                <div className="flex flex-col">
                    <ItemTitle
                        className="cursor-pointer leading-none font-semibold hover:underline"
                        onClick={handleCardClick}
                    >
                        {character.name}
                    </ItemTitle>
                    <div className="flex justify-between text-muted-foreground">
                        <Link
                            from="/explore/chub"
                            search={(prev) => ({
                                ...prev,
                                creator: character.fullPath.split("/")[0].replace("@", ""),
                                excludedTags: "",
                                sort: "created_at"
                            })}
                            className="hover:underline"
                        >
                            @{character.fullPath.split("/")[0]}
                        </Link>
                        <span className="flex gap-1">
                            <Heart fill="hotpink" className="mt-px size-4 text-[hotpink]" />
                            {character.n_favorites}
                        </span>
                    </div>
                </div>
                <ItemDescription className="line-clamp-4 text-foreground">
                    {character.tagline}
                </ItemDescription>
            </ItemContent>
            <ItemFooter className="flex-col">
                <TagList
                    tags={character.topics}
                    className="cursor-pointer hover:bg-secondary"
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
