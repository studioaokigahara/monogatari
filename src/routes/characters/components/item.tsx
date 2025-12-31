import { TagList } from "@/components/tags";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemMedia,
    ItemTitle
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Character } from "@/database/schema/character";
import { useImageURL } from "@/hooks/use-image-url";
import { Link } from "@tanstack/react-router";

export default function CharacterItem({ character }: { character: Character }) {
    const imageURL = useImageURL({
        category: "character",
        id: character.id,
        assets: character.data.assets
    });

    return (
        <Item
            variant="outline"
            className="h-48 flex-nowrap p-2 gap-2 overflow-hidden"
        >
            <ItemMedia className="h-full aspect-2/3 translate-y-[unset]!">
                <Link to="/characters/$id" params={{ id: character.id }}>
                    <Avatar className="size-[unset] overflow-visible">
                        <AvatarImage
                            src={imageURL}
                            className="absolute blur-3xl saturate-200"
                        />
                        <AvatarImage
                            src={imageURL}
                            alt={character.data.name}
                            className="aspect-2/3 object-cover rounded-md z-1"
                        />
                        <AvatarFallback className="rounded-md">
                            <Skeleton className="h-full aspect-2/3" />
                        </AvatarFallback>
                    </Avatar>
                </Link>
            </ItemMedia>
            <ItemContent className="h-full z-1">
                <ItemTitle className="flex-col items-start gap-0 leading-none">
                    <Link to="/characters/$id" params={{ id: character.id }}>
                        {character.data.name}
                    </Link>
                    <ItemDescription className="leading-snug">
                        {character.data.creator}
                    </ItemDescription>
                </ItemTitle>
                <ItemDescription className="text-foreground line-clamp-4 leading-snug text-pretty">
                    {character?.data.extensions.monogatari?.tagline ??
                        character?.data.creator_notes}
                </ItemDescription>
                <ItemFooter className="mt-auto basis-0">
                    <TagList tags={character.data.tags} />
                </ItemFooter>
            </ItemContent>
        </Item>
    );
}
