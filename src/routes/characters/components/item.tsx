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
import { Character } from "@/database/schema/character";
import { useImageURL } from "@/hooks/use-image-url";
import { Link } from "@tanstack/react-router";

interface CharacterItemProps extends React.ComponentProps<typeof Item> {
    character: Character;
}

export default function CharacterItem({ character, ...props }: CharacterItemProps) {
    const portrait = character.data.assets.find((asset) => asset.name === "portrait");
    const imageURL = useImageURL({
        category: "character",
        id: character.id,
        assets: character.data.assets,
        filename: portrait ? `portrait.${portrait.ext}` : undefined
    });

    return (
        <Item variant="outline" className="h-48 flex-nowrap overflow-hidden" {...props}>
            <ItemMedia className="translate-y-0!">
                <Link to="/characters/$id" params={{ id: character.id }}>
                    <Avatar className="aspect-2/3 h-44 w-auto rounded-md after:rounded-md">
                        <AvatarImage
                            src={imageURL}
                            alt={character.data.name}
                            className="rounded-md object-cover"
                        />
                        <AvatarFallback className="animate-pulse rounded-md" />
                    </Avatar>
                </Link>
            </ItemMedia>
            <ItemContent className="z-1 h-full">
                <ItemTitle className="flex-col items-start gap-0 leading-none">
                    <Link to="/characters/$id" params={{ id: character.id }}>
                        {character.data.name}
                    </Link>
                    <ItemDescription className="leading-snug">
                        {character.data.creator}
                    </ItemDescription>
                </ItemTitle>
                <ItemDescription className="line-clamp-4 leading-snug text-pretty text-foreground">
                    {character?.data.extensions.monogatari?.tagline ??
                        character?.data.creator_notes}
                </ItemDescription>
                <ItemFooter className="mt-auto basis-0">
                    {character.data.tags.length > 0 && <TagList tags={character.data.tags} />}
                </ItemFooter>
            </ItemContent>
        </Item>
    );
}
