import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ItemGroup } from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { importCharacterFile } from "@/lib/character/io";
import { characterSearchSchema, listCharacters } from "@/lib/character/search";
import { cn } from "@/lib/utils";
import CharacterItem from "@/routes/characters/components/item";
import { Search } from "@/routes/characters/components/search";
import {
    createFileRoute,
    Link,
    stripSearchParams,
    useElementScrollRestoration,
    useLoaderData,
    useNavigate,
    useSearch
} from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { Import, UserPlus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

function Favorites({ favorites }: { favorites: Character[] }) {
    const imageURLs = useImageURL(
        favorites.map((favorite) => ({
            category: "character" as const,
            id: favorite.id,
            assets: favorite.data.assets
        }))
    );

    const favoriteCards = favorites.map((character, index) => (
        <Link key={character.id} to="/characters/$id" params={{ id: character.id }}>
            <Avatar className="aspect-2/3 h-36 w-auto scale-95 rounded-md transition duration-75 after:rounded-md hover:scale-100">
                <AvatarImage
                    src={imageURLs[index]}
                    alt={character.data.name}
                    className="z-1 aspect-2/3 rounded-md object-cover hover:brightness-100 hover:saturate-100 sm:brightness-50 sm:saturate-75"
                />
                <AvatarFallback className="animate-pulse rounded-md" />
            </Avatar>
        </Link>
    ));

    return (
        <ScrollArea className="-mb-1">
            <div className="flex w-max flex-row gap-2">{favoriteCards}</div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}

function CharacterList({ characters }: { characters: Character[] }) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(0);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setGridWidth(entry.contentRect.width);
        });

        observer.observe(grid);
        return () => observer.disconnect();
    }, []);

    const columns = Math.max(1, Math.floor(gridWidth / 384));
    const rows = Math.ceil(characters.length / columns);

    const scrollEntry = useElementScrollRestoration({
        getElement: () => window
    });

    const virtualizer = useWindowVirtualizer({
        count: rows,
        estimateSize: () => 192,
        overscan: 4,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
        gap: 8,
        initialOffset: scrollEntry?.scrollY
    });

    const characterItems = characters.map((character) => (
        <CharacterItem key={character.id} character={character} />
    ));

    if (!characters?.length) {
        return (
            <div ref={gridRef} className="relative mb-2 w-full">
                <p>Ain't nobody here but us chickens.</p>
            </div>
        );
    }

    return (
        <ItemGroup
            ref={gridRef}
            className="relative mb-2 w-full"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualizer.getVirtualItems().map((row) => (
                <ItemGroup
                    key={row.key}
                    ref={virtualizer.measureElement}
                    data-index={row.index}
                    className={cn(
                        "absolute top-0 left-0 w-full",
                        "grid grid-flow-row grid-cols-[repeat(auto-fill,minmax(min(24rem,100%),1fr))] gap-2"
                    )}
                    style={{
                        transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`
                    }}
                >
                    {Array.from({ length: columns }).map((_, index) => {
                        const itemIndex = row.index * columns + index;
                        const characterItem = characterItems[itemIndex];
                        if (!characterItem) return null;
                        return characterItem;
                    })}
                </ItemGroup>
            ))}
        </ItemGroup>
    );
}

function Characters() {
    const navigate = useNavigate();

    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        toast.promise(importCharacterFile(event), {
            loading: "Importing character card...",
            success: (character) => {
                void navigate({
                    to: `/characters/$id`,
                    params: { id: character.id }
                });
                return `${character?.data.name} imported successfully!`;
            },
            error: (error: Error) => {
                console.log(error);
                return {
                    message: "Failed to import character card",
                    description: error.message
                };
            }
        });
    };

    const { browse, input } = useFileDialog({
        accept: ".png, .json, .charx",
        onChange: handleFile
    });

    const [loadedCharacters, favorites] = useLoaderData({
        from: "/characters/"
    });

    const { search, page, sort, limit } = useSearch({ from: "/characters/" });

    const characters = useLiveQuery(
        () => listCharacters(page, limit, sort, search),
        [page, limit, search, sort],
        loadedCharacters
    );

    const createNewCharacter = () => navigate({ to: "/characters/new" });

    return (
        <>
            <Header className="justify-between">
                <ButtonGroup>
                    <Button variant="outline" onClick={createNewCharacter}>
                        <UserPlus />
                        New
                    </Button>
                    <Button variant="outline" onClick={browse}>
                        {input}
                        <Import />
                        Import
                    </Button>
                </ButtonGroup>
            </Header>
            <div className="flex flex-col gap-2">
                <Favorites favorites={favorites} />
                <Search />
                <CharacterList characters={characters} />
            </div>
        </>
    );
}

export const Route = createFileRoute("/characters/")({
    component: Characters,
    validateSearch: characterSearchSchema,
    beforeLoad: () => ({
        breadcrumb: null
    }),
    loaderDeps: ({ search: { search, page, limit, sort } }) => ({
        search,
        page,
        limit,
        sort
    }),
    loader: async ({ deps: { search, page, limit, sort } }) => {
        return await Promise.all([
            listCharacters(page, limit, sort, search),
            db.characters.where("favorite").equals(1).reverse().toArray()
        ]);
    },
    search: {
        middlewares: [
            stripSearchParams({
                search: ""
            })
        ]
    }
});
