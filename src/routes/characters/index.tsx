import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@/components/ui/input-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { handleFileChange } from "@/lib/character/io";
import { cn } from "@/lib/utils";
import CharacterItem from "@/routes/characters/components/item";
import {
    Link,
    createFileRoute,
    useLoaderData,
    useNavigate
} from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Collection } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    CalendarArrowDown,
    CalendarArrowUp,
    ClockArrowDown,
    ClockArrowUp,
    Dices,
    Import,
    SearchIcon,
    UserPlus
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import useEvent from "react-use-event-hook";

type SearchOrders =
    | "a-z"
    | "z-a"
    | "createdAt_asc"
    | "createdAt_desc"
    | "updatedAt_asc"
    | "updatedAt_desc"
    | "random";

async function listCharacters(query?: string, order: SearchOrders = "a-z") {
    let collection: Collection;

    switch (order) {
        case "a-z":
            collection = db.characters.orderBy("data.name");
            break;
        case "z-a":
            collection = db.characters.orderBy("data.name").reverse();
            break;
        case "createdAt_asc":
            collection = db.characters.orderBy("createdAt");
            break;
        case "createdAt_desc":
            collection = db.characters.orderBy("createdAt").reverse();
            break;
        case "updatedAt_asc":
            collection = db.characters.orderBy("updatedAt");
            break;
        case "updatedAt_desc":
            collection = db.characters.orderBy("updatedAt").reverse();
            break;
        case "random":
            collection = db.characters.toCollection();
            break;
        default:
            collection = db.characters.orderBy("data.name");
    }

    if (query) {
        collection = collection.filter((character: Character) =>
            character.data.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    const array = (await collection.toArray()) as Character[];

    if (order === "random") {
        return array.sort(() => Math.random() - 0.5);
    }

    return array;
}

interface SearchProps {
    searchTermState: [string, React.Dispatch<React.SetStateAction<string>>];
    searchOrderState: [
        SearchOrders,
        React.Dispatch<React.SetStateAction<SearchOrders>>
    ];
}

function Search({ searchTermState, searchOrderState }: SearchProps) {
    const [searchTerm, setSearchTerm] = searchTermState;
    const [searchOrder, setSearchOrder] = searchOrderState;

    const sortOptions = [
        { label: "A-Z", icon: <ArrowDownAZ />, value: "a-z" },
        { label: "Z-A", icon: <ArrowUpAZ />, value: "z-a" },
        { label: "Newest", icon: <CalendarArrowUp />, value: "createdAt_asc" },
        {
            label: "Oldest",
            icon: <CalendarArrowDown />,
            value: "createdAt_desc"
        },
        {
            label: "Recent",
            icon: <ClockArrowUp />,
            value: "updatedAt_desc"
        },
        {
            label: "Stale",
            icon: <ClockArrowDown />,
            value: "updatedAt_asc"
        },
        { label: "Random", icon: <Dices />, value: "random" }
    ];

    const changeSearchOrder = (value: string) => {
        setSearchOrder(value as SearchOrders);
    };

    const changeSearchTerm = useEvent(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(event.target.value);
        }
    );

    const selectItems = sortOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    return (
        <div className="sticky top-2 z-50 w-full">
            <Card className="w-full py-4 bg-background/66 backdrop-blur">
                <CardContent className="px-4">
                    <ButtonGroup className="w-full">
                        <Select
                            value={searchOrder}
                            onValueChange={changeSearchOrder}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort By..." />
                            </SelectTrigger>
                            <SelectContent>{selectItems}</SelectContent>
                        </Select>
                        <InputGroup>
                            <InputGroupInput
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={changeSearchTerm}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                    </ButtonGroup>
                </CardContent>
            </Card>
        </div>
    );
}

function Favorites({ favorites }: { favorites: Character[] }) {
    const imageURLs = useImageURL(
        favorites.map((favorite) => ({
            category: "character" as const,
            id: favorite.id,
            assets: favorite.data.assets
        }))
    );

    const favoriteCards = favorites.map((character, index) => (
        <Link
            key={character.id}
            to="/characters/$id"
            params={{ id: character.id }}
        >
            <Avatar className="w-full h-36 rounded-md transition duration-75 scale-95 hover:scale-100">
                <AvatarImage
                    src={imageURLs[index]}
                    alt={character.data.name}
                    className="aspect-2/3 object-cover sm:brightness-50 sm:saturate-75 hover:brightness-100 hover:saturate-100"
                />
                <AvatarFallback className="rounded-md">
                    <Skeleton className="h-full aspect-2/3" />
                </AvatarFallback>
            </Avatar>
        </Link>
    ));

    return (
        <ScrollArea className="-mb-1">
            <div className="w-max flex flex-row gap-2">{favoriteCards}</div>
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

    const virtualizer = useWindowVirtualizer({
        count: rows,
        estimateSize: () => 192,
        overscan: 4,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
        gap: 8
    });

    const characterItems = characters.map((character) => (
        <CharacterItem key={character.id} character={character} />
    ));

    if (!characters?.length) {
        return <p>Ain't nobody here but us chickens.</p>;
    }

    return (
        <div
            ref={gridRef}
            className="relative w-full mb-2"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualizer.getVirtualItems().map((row) => (
                <div
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
                </div>
            ))}
        </div>
    );
}

function Characters() {
    const { browse, input } = useFileDialog({
        accept: ".png, .json, .charx",
        onChange: handleFileChange
    });

    const [loadedCharacters, favorites] = useLoaderData({
        from: "/characters/"
    });

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [searchOrder, setSearchOrder] = useState<SearchOrders>("a-z");

    const characters = useLiveQuery(
        () => listCharacters(searchTerm, searchOrder),
        [searchTerm, searchOrder],
        loadedCharacters
    );

    const navigate = useNavigate();
    const createNewCharacter = () => navigate({ to: "/characters/new" });

    return (
        <>
            <Header className="justify-between">
                <ButtonGroup>
                    <Button variant="outline" onClick={browse}>
                        {input}
                        <Import />
                        Import
                    </Button>
                    <Button variant="outline" onClick={createNewCharacter}>
                        <UserPlus />
                        New
                    </Button>
                </ButtonGroup>
            </Header>
            <div className="flex flex-col gap-2">
                <Favorites favorites={favorites} />
                <Search
                    searchTermState={[searchTerm, setSearchTerm]}
                    searchOrderState={[searchOrder, setSearchOrder]}
                />
                <CharacterList characters={characters} />
            </div>
        </>
    );
}

export const Route = createFileRoute("/characters/")({
    component: Characters,
    beforeLoad: () => ({
        breadcrumb: null
    }),
    loader: async () =>
        await Promise.all([
            listCharacters(),
            db.characters.where("favorite").equals(1).reverse().toArray()
        ])
});
