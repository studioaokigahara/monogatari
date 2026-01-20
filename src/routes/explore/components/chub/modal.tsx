import { Markdown } from "@/components/markdown";
import { TagList } from "@/components/tag-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";
import { type ChubCharacter } from "@/types/explore/chub";
import { Link } from "@tanstack/react-router";
import { Cake, CalendarClock, Download, Heart, Star, StarHalf, TextSelect } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
    const stars = [];

    for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(
            <Star key={`star-${i}`} fill="currentColor" className="size-4 text-yellow-500" />
        );
    }

    if (rating % 1 >= 0.5) {
        stars.push(<StarHalf key="half-star" className="h-4 w-4 text-yellow-500" />);
    }

    return stars;
}

interface CharacterModalProps {
    character: ChubCharacter;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isDownloaded: boolean;
    onDownloadClick: (character: ChubCharacter) => Promise<void>;
    onTagClick: (tag: string) => void;
}

export function CharacterModal({
    character,
    open,
    onOpenChange,
    isDownloaded,
    onDownloadClick,
    onTagClick
}: CharacterModalProps) {
    const handleDownloadClick = async () => {
        await onDownloadClick(character);
        onOpenChange(false);
    };

    const handleTagClick = (event: React.MouseEvent, tag: string) => {
        event.preventDefault();
        onTagClick(tag);
        onOpenChange(false);
    };

    const initialState = isDownloaded ? "ready_update" : "ready_download";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTitle className="sr-only">Character Popup</DialogTitle>
            <DialogDescription className="sr-only">{character.name}</DialogDescription>
            <DialogContent
                className={cn(
                    "flex max-h-[90%] before:-z-1! sm:max-w-[90%]",
                    isDownloaded && "ring-2 ring-green-500/50"
                )}
            >
                <div className="flex flex-col gap-6 md:flex-row">
                    <div className="flex flex-col space-y-4 overflow-y-auto md:basis-2/5">
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
                            <DownloadButton
                                initialState={initialState}
                                onClick={handleDownloadClick}
                                variant="secondary"
                                className="absolute right-4 bottom-4 cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col space-y-2 text-sm">
                            <div className="flex items-center gap-1">
                                <Cake className="size-4" />
                                <span>
                                    Created {new Date(character.createdAt).toLocaleDateString()} by{" "}
                                    <Link
                                        from="/explore/chub"
                                        search={(prev) => ({
                                            ...prev,
                                            creator: character.fullPath
                                                .split("/")[0]
                                                .replace("@", ""),
                                            excludedTags: "",
                                            sort: "created_at"
                                        })}
                                        onClick={() => onOpenChange(false)}
                                        className="font-bold hover:underline"
                                    >
                                        @{character.fullPath.split("/")[0]}
                                    </Link>
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <CalendarClock className="size-4" />
                                <span>
                                    Last Updated{" "}
                                    {new Date(character.lastActivityAt).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1">
                                    <StarRating rating={character.rating} />
                                    <span>{character.ratingCount} ratings</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Heart fill="hotpink" className="size-4 text-[hotpink]" />
                                    <span>{character.n_favorites} favorites</span>
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
                    <div className="flex flex-col space-y-4 overflow-y-scroll md:basis-3/5">
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

                        <div className="mb-4 flex flex-wrap gap-1">
                            <TagList tags={character.topics} onTagClick={handleTagClick} />
                        </div>

                        <p className="mb-2 font-semibold">{character.tagline}</p>
                        <hr className="my-2" />
                        <Markdown>
                            {character.description.replaceAll(
                                /body:{1,2}before/g,
                                "div[data-slot='dialog-content']::before"
                            )}
                        </Markdown>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
