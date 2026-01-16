import { Markdown } from "@/components/markdown";
import { TagList } from "@/components/tag-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DownloadButton } from "@/routes/explore/components/download-button";
import { type ChubCharacter } from "@/types/explore/chub";
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
    openState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    isDownloaded: boolean;
    onDownloadClick: (character: ChubCharacter) => Promise<void>;
    onTagClick: (tag: string) => void;
    onCreatorClick: (creator: string) => void;
}

export function CharacterModal({
    character,
    openState,
    isDownloaded,
    onDownloadClick,
    onTagClick,
    onCreatorClick
}: CharacterModalProps) {
    const [open, setOpen] = openState;

    const handleDownloadClick = async () => {
        await onDownloadClick(character);
        setOpen(false);
    };

    const handleTagClick = (event: React.MouseEvent, tag: string) => {
        event.preventDefault();
        onTagClick(tag);
        setOpen(false);
    };

    const handleCreatorClick = () => {
        onCreatorClick(character.fullPath.split("/")[0]);
        setOpen(false);
    };

    const initialState = isDownloaded ? "ready_update" : "ready_download";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTitle className="sr-only">Character Popup</DialogTitle>
            <DialogDescription className="sr-only">{character.name}</DialogDescription>
            <DialogContent
                className={cn(
                    "flex sm:max-w-[90%] max-h-[90%] before:-z-1!",
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
                            <DownloadButton
                                initialState={initialState}
                                onClick={handleDownloadClick}
                                variant="secondary"
                                className="absolute bottom-4 right-4 cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col space-y-2 text-sm">
                            <div className="flex items-center gap-1">
                                <Cake className="size-4" />
                                <span>
                                    Created {new Date(character.createdAt).toLocaleDateString()} by{" "}
                                    <span
                                        role="button"
                                        className="font-bold cursor-pointer hover:underline"
                                        onClick={handleCreatorClick}
                                    >
                                        @{character.fullPath.split("/")[0]}
                                    </span>
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
                            <TagList tags={character.topics} onTagClick={handleTagClick} />
                        </div>

                        <p className="font-semibold mb-2">{character.tagline}</p>
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
