import { TagList } from "@/components/tag-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemMedia,
    ItemTitle
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";
import { type ChubCharacter } from "@/types/explore/chub";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

interface Props extends React.ComponentProps<typeof Item> {
    character: ChubCharacter;
    isDownloaded: boolean;
    onCharacterClick: () => void;
    onDownloadClick: () => Promise<void>;
    onTagClick: (tag: string) => void;
}

export function ChubCharacterItem({
    character,
    isDownloaded,
    onCharacterClick,
    onDownloadClick,
    onTagClick,
    ...props
}: Props) {
    const buttonState = isDownloaded ? "ready_update" : "ready_download";

    return (
        <Item
            variant="outline"
            className={cn("flex-nowrap", isDownloaded && "ring-2 ring-green-500/50")}
            {...props}
        >
            <ItemMedia className="aspect-square translate-y-[unset]!">
                <Avatar
                    className="size-50 cursor-pointer rounded-md after:rounded-md"
                    onClick={onCharacterClick}
                >
                    <AvatarImage
                        src={character.avatar_url}
                        alt={character.name}
                        className="rounded-md"
                    />
                    <AvatarFallback className="animate-pulse rounded-md" />
                    <DownloadButton
                        initialState={buttonState}
                        onClick={onDownloadClick}
                        variant="outline"
                        size="sm"
                        className="absolute right-2 bottom-2 z-2 backdrop-blur backdrop-brightness-50"
                    />
                </Avatar>
            </ItemMedia>
            <ItemContent className="h-full overflow-hidden">
                <ItemTitle
                    className="cursor-pointer leading-none font-semibold underline-offset-2 hover:underline"
                    onClick={onCharacterClick}
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
                <ItemDescription className="line-clamp-4 text-foreground">
                    {character.tagline}
                </ItemDescription>
                <ItemFooter className="mt-auto basis-0">
                    <TagList
                        tags={character.topics}
                        className="cursor-pointer hover:bg-secondary"
                        onTagClick={onTagClick}
                    />
                </ItemFooter>
            </ItemContent>
        </Item>
    );
}
