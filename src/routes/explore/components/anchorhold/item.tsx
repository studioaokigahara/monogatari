import { Markdown } from "@/components/markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
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
            variant="outline"
            className={cn(
                "flex h-64 flex-row items-start sm:h-96",
                isDownloaded && "mx-0.5 ring-2 ring-green-500/50"
            )}
        >
            <ItemMedia className="h-full">
                <Avatar className="aspect-2/3 size-[unset] max-h-full rounded-xl after:rounded-xl">
                    <AvatarImage
                        src={post.imageURL}
                        alt={post.postID}
                        className="rounded-xl object-cover"
                    />
                    <AvatarFallback className="animate-pulse rounded-xl" />
                    <DownloadButton
                        initialState={buttonState}
                        onClick={handleClick}
                        variant="outline"
                        size="sm"
                        className="absolute right-2 bottom-2 z-2 backdrop-blur backdrop-brightness-50"
                    />
                </Avatar>
            </ItemMedia>
            <ItemContent className="h-full overflow-y-scroll">
                <ItemTitle>
                    <a href={post.postURL} target="_blank" rel="noopener noreferrer">
                        {">>>"}
                        {post.board ?? ""}
                        {post.postID ?? ""}
                    </a>
                </ItemTitle>
                <div className="line-clamp-none">
                    <Markdown className="prose-greentext">{post.content}</Markdown>
                </div>
            </ItemContent>
        </Item>
    );
}
