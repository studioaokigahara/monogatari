import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ItemGroup } from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    searchCollectionKey,
    searchSettingsCollection
} from "@/database/collections/character-search";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { importCharacterFile } from "@/lib/character/io";
import { CharacterSearch, listCharacters } from "@/lib/character/search";
import CharacterItem from "@/routes/characters/components/item";
import { Search } from "@/routes/characters/components/search";
import {
    createFileRoute,
    Link,
    SearchSchemaInput,
    stripSearchParams,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setContainerWidth(entry.contentRect.width);
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const virtualizer = useWindowVirtualizer({
        count: characters.length,
        estimateSize: () => 192,
        overscan: 4,
        scrollMargin: containerRef.current?.offsetTop ?? 0,
        gap: 8,
        lanes: Math.max(1, Math.floor(containerWidth / 384))
        // useFlushSync: false
    });

    if (!characters?.length) {
        return (
            <div ref={containerRef} className="relative mb-2 w-full">
                <p>Ain't nobody here but us chickens.</p>
            </div>
        );
    }

    return (
        <ItemGroup
            ref={containerRef}
            className="relative mb-2 w-full"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualizer.getVirtualItems().map((item) => {
                const character = characters[item.index];
                const { scrollMargin, gap, lanes } = virtualizer.options;
                return (
                    <CharacterItem
                        key={character.id}
                        data-index={item.index}
                        character={character}
                        style={{
                            position: "absolute",
                            left: `calc(${item.lane} * (100% + ${gap}px) / ${lanes})`,
                            width: `calc((100% - ${(lanes - 1) * gap}px) / ${lanes})`,
                            height: `${item.size}px`,
                            transform: `translateY(${item.start - scrollMargin}px)`
                        }}
                    />
                );
            })}
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
    validateSearch: (search: Partial<CharacterSearch> & SearchSchemaInput) => {
        return CharacterSearch.parse({
            ...searchSettingsCollection.get(searchCollectionKey)!,
            ...search
        });
    },
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
