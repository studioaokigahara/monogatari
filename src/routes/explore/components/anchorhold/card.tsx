import { Prose } from "@/components/prose";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { AnchorholdPost } from "@/lib/explore/anchorhold/api";
import { getButtonIcon, getButtonText } from "@/lib/explore/chub/utils";
import { ButtonState } from "@/types/explore/chub";

interface Props {
    post: AnchorholdPost;
    buttonState: ButtonState;
    handleDownload: (post: AnchorholdPost) => void;
}

export default function AnchorholdCard({
    post,
    buttonState,
    handleDownload
}: Props) {
    return (
        <Item
            variant="muted"
            className="flex flex-row h-96 items-start overflow-hidden transition duration-75 will-change-[translate,box-shadow] hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/50"
        >
            <ItemMedia className="h-full">
                <Avatar className="max-h-full aspect-2/3 size-[unset] overflow-visible">
                    <AvatarImage
                        src={post.imageURL}
                        className="absolute blur-xl z-0"
                    />
                    <AvatarImage
                        src={post.imageURL}
                        alt={post.postID}
                        className="object-cover rounded-xl z-1"
                    />
                    <AvatarFallback className="rounded-xl">
                        <Skeleton className="h-88 aspect-2/3" />
                    </AvatarFallback>
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute backdrop-blur backdrop-brightness-80 bottom-2 right-2 z-2"
                        onClick={() => handleDownload(post)}
                    >
                        {getButtonIcon(buttonState)}
                        <span>{getButtonText(buttonState)}</span>
                    </Button>
                </Avatar>
            </ItemMedia>
            <ItemContent className="h-full overflow-y-scroll z-1">
                <ItemTitle>
                    <a
                        href={post.postURL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {">>>"}
                        {post.board ?? ""}
                        {post.postID ?? ""}
                    </a>
                </ItemTitle>
                <ItemDescription className="line-clamp-none">
                    <Prose className="prose-blockquoteless">
                        {post.content}
                    </Prose>
                </ItemDescription>
            </ItemContent>
        </Item>
    );
}
