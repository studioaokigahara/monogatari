import React from "react";

import { TagList } from "@/components/tags";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CharacterRecord } from "@/database/schema/character";
import { useImageURL } from "@/contexts/image-context";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

interface CharacterImageProps {
    imageURL: string;
    character: CharacterRecord;
}

function CharacterImage({ imageURL, character }: CharacterImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
    }, [imageURL]);

    const size = imageLoaded ? "w-1/4" : "hidden";

    return (
        <>
            {imageURL && (
                <Link
                    to="/characters/$id"
                    params={{ id: character.id }}
                    className={`${size} shrink-0`}
                >
                    <img
                        src={imageURL}
                        alt={character.data.name}
                        className={`aspect-2/3 rounded-md object-cover`}
                        onLoad={() => setImageLoaded(true)}
                    />
                </Link>
            )}
            {(!imageURL || !imageLoaded) && (
                <Skeleton className="w-1/4 shrink-0 aspect-2/3 rounded-md" />
            )}
        </>
    );
}

interface CharacterCardProps {
    character: CharacterRecord;
}

function CharacterCard({ character }: CharacterCardProps) {
    const image =
        character.assets.find((asset) => asset.name === "main")?.blob ??
        character.assets[0].blob;
    const imageURL = useImageURL(image);

    return (
        <Card className="max-w-2xl w-full max-h-48 h-full flex flex-0 flex-row p-2 gap-4 border rounded-lg shadow-sm overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/50">
            <CharacterImage imageURL={imageURL} character={character} />
            <div className="w-full flex flex-col overflow-hidden">
                <CardHeader className="p-0 mb-2 gap-0">
                    <CardTitle>
                        <Link
                            to="/characters/$id"
                            params={{ id: character.id }}
                        >
                            {character.data.name}
                        </Link>
                    </CardTitle>
                    <CardDescription>{character.data.creator}</CardDescription>
                </CardHeader>
                <CardContent className="p-0 mb-auto text-sm">
                    <p className="line-clamp-3">
                        {character.data.creator_notes}
                    </p>
                </CardContent>
                <CardFooter className="p-0 w-full">
                    <TagList tags={character.data.tags ?? []} />
                </CardFooter>
            </div>
        </Card>
    );
}

export default React.memo(CharacterCard);
