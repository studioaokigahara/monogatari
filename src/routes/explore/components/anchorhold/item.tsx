import { Markdown } from "@/components/markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { AnchorholdPost } from "@/lib/explore/anchorhold/api";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";

interface Props {
    post: AnchorholdPost;
    isDownloaded: boolean;
    onClick: () => Promise<void>;
}

export function AnchorholdItem({ post, isDownloaded, onClick: handleClick }: Props) {
    const buttonState = isDownloaded ? "ready_update" : "ready_download";
    return (
        <Item
            variant="muted"
            className={cn(
                "flex flex-row h-64 sm:h-96 items-start overflow-hidden",
                isDownloaded && "ring-2 ring-green-500/50"
            )}
        >
            <ItemMedia className="h-full">
                <Avatar className="max-h-full aspect-2/3 size-[unset] overflow-visible">
                    <AvatarImage src={post.imageURL} className="absolute blur-xl z-0" />
                    <AvatarImage
                        src={post.imageURL}
                        alt={post.postID}
                        className="object-cover rounded-xl z-1"
                    />
                    <AvatarFallback className="rounded-xl">
                        <Skeleton className="h-88 aspect-2/3" />
                    </AvatarFallback>
                    <DownloadButton
                        initialState={buttonState}
                        onClick={handleClick}
                        variant="outline"
                        size="sm"
                        className="absolute backdrop-blur backdrop-brightness-80 bottom-2 right-2 z-2"
                    />
                </Avatar>
            </ItemMedia>
            <ItemContent className="h-full overflow-y-scroll z-1">
                <ItemTitle>
                    <a href={post.postURL} target="_blank" rel="noopener noreferrer">
                        {">>>"}
                        {post.board ?? ""}
                        {post.postID ?? ""}
                    </a>
                </ItemTitle>
                <ItemDescription className="line-clamp-none">
                    <Markdown className="prose-greentext">{post.content}</Markdown>
                </ItemDescription>
            </ItemContent>
        </Item>
    );
}
