import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TagList } from "@/components/tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterArchiveItem } from "@/types/explore/charchive";
import { ChevronsLeftRightEllipsis } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    item: CharacterArchiveItem;
}

export function CharacterArchiveCard({ item }: Props) {
    const imageURL = `https://char-archive.evulid.cc/api/archive/v1/${item.source}/image/${item.type}/${item.author}/${item.chub?.fullPath[1] ?? item.name}`;
    const thumbnailURL = `${imageURL}?max=200&thumbnail=true&square=true&format=jpeg&optimize=false`;

    return (
        <Card className="h-full flex flex-row md:flex-col gap-2 md:gap-0 overflow-hidden py-4 *:px-4 transition will-change-[scale,box-shadow] hover:scale-102 hover:shadow-lg hover:shadow-gray-500/50">
            <CardHeader className="relative">
                <Avatar className="size-50 mx-auto overflow-visible">
                    <AvatarImage
                        src={thumbnailURL}
                        className="absolute scale-150 blur-xl z-0"
                    />
                    <AvatarImage
                        src={thumbnailURL}
                        alt={item.name}
                        className="rounded-xl z-1"
                    />
                    <AvatarFallback className="rounded-xl">
                        <Skeleton />
                    </AvatarFallback>
                </Avatar>
                <Button
                    variant="outline"
                    size="sm"
                    className="backdrop-blur z-2 cursor-pointer"
                >
                    Download
                </Button>
            </CardHeader>
            <CardContent className="max-w-3/5 md:max-w-full z-1">
                <CardTitle className="text-lg font-bold truncate hover:underline cursor-pointer">
                    {item.name}
                </CardTitle>
                <div className="flex flex-wrap items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground hover:underline cursor-pointer">
                        @{item.author}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ChevronsLeftRightEllipsis className="size-5" />
                        {item.source === "chub" ? (
                            <a
                                href={`https://www.chub.ai/characters/${item.chub?.fullPath[0]}/${item.chub?.fullPath[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {item.source}
                            </a>
                        ) : (
                            <span>
                                {item.source === "generic"
                                    ? item.sourceSpecific
                                    : item.source}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-sm line-clamp-6 mb-2">{item.tagline}</p>
                <TagList
                    tags={item.tags}
                    className="hover:bg-secondary cursor-pointer"
                />
            </CardContent>
        </Card>
    );
}
