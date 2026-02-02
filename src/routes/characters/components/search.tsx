import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    searchCollectionKey,
    searchSettingsCollection
} from "@/database/collections/character-search";
import { usePaginationRange } from "@/hooks/use-pagination-range";
import { CharacterSearch, countCharacters } from "@/lib/character/search";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { debounce } from "es-toolkit";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    CalendarArrowDown,
    CalendarArrowUp,
    ClockArrowDown,
    ClockArrowUp,
    Dices,
    Hash,
    SearchIcon
} from "lucide-react";
import { useState } from "react";

const SORT_OPTIONS = [
    { label: "A-Z", icon: <ArrowDownAZ />, value: "a-z" },
    { label: "Z-A", icon: <ArrowUpAZ />, value: "z-a" },
    { label: "Newest", icon: <CalendarArrowUp />, value: "newest" },
    {
        label: "Oldest",
        icon: <CalendarArrowDown />,
        value: "oldest"
    },
    {
        label: "Recent",
        icon: <ClockArrowUp />,
        value: "recent"
    },
    {
        label: "Stale",
        icon: <ClockArrowDown />,
        value: "stale"
    },
    { label: "Random", icon: <Dices />, value: "random" }
];

const LIMIT_OPTIONS = [12, 24, 36, 48, 60, 1536];

export function Search() {
    const { page, sort, limit, search } = useSearch({ from: "/characters/" });
    const navigate = useNavigate({ from: "/characters/" });
    const characterCount = useLiveQuery(() => countCharacters(search), [search], 0);
    const totalPages = Math.max(1, Math.ceil(characterCount / limit));

    const changeSort = (value: CharacterSearch["sort"]) => {
        searchSettingsCollection.update(searchCollectionKey, (settings) => {
            settings.sort = value;
        });
        void navigate({
            search: (prev) => ({ ...prev, sort: value })
        });
    };

    const changeLimit = (value: number) => {
        searchSettingsCollection.update(searchCollectionKey, (settings) => {
            settings.limit = value;
        });
        void navigate({
            search: (prev) => ({ ...prev, limit: value })
        });
    };

    const [input, setInput] = useState(search);

    const debouncedSearch = debounce((value: string) => {
        void navigate({
            search: (prev) => ({ ...prev, search: value.trim() })
        });
    }, 250);

    const updateSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setInput(value);
        debouncedSearch(value);
    };

    const sortItems = SORT_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    const limitItems = LIMIT_OPTIONS.map((option) => (
        <SelectItem key={option} value={String(option)}>
            <Hash />
            {String(option)}
        </SelectItem>
    ));

    const paginationItems = usePaginationRange({ page, totalPages }).map((item, index) => (
        <PaginationItem key={`${item}-${index}`}>
            {item === "ellipsis" ? (
                <PaginationEllipsis />
            ) : (
                <PaginationLink
                    isActive={item === page}
                    from="/characters/"
                    search={(prev) => ({ ...prev, page: item })}
                >
                    {item}
                </PaginationLink>
            )}
        </PaginationItem>
    ));

    return (
        <div className="sticky top-2 z-50">
            <Card size="sm" className="w-full bg-background/66 pb-2 backdrop-blur">
                <CardContent className="flex flex-col gap-2">
                    <ButtonGroup className="w-full">
                        <Select
                            value={sort}
                            onValueChange={(value) => {
                                changeSort(value as CharacterSearch["sort"]);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort By...">
                                    {(value: string) => {
                                        const item = SORT_OPTIONS.find(
                                            (option) => option.value === value
                                        );
                                        return (
                                            <span className="flex items-center gap-1.5">
                                                {item?.icon}
                                                {item?.label}
                                            </span>
                                        );
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>{sortItems}</SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(limit)}
                            onValueChange={(value) => changeLimit(Number(value))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Cards per page...">
                                    {(value) => (
                                        <span className="flex items-center gap-1.5">
                                            <Hash />
                                            {value}
                                        </span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>{limitItems}</SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputGroup>
                            <InputGroupInput
                                placeholder="Search..."
                                value={input}
                                onChange={updateSearch}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                    </ButtonGroup>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    disabled={page === 1}
                                    from="/characters/"
                                    search={(prev) => ({
                                        ...prev,
                                        page: prev.page - 1
                                    })}
                                />
                            </PaginationItem>
                            {paginationItems}
                            <PaginationItem>
                                <PaginationNext
                                    disabled={page === totalPages}
                                    from="/characters/"
                                    search={(prev) => ({
                                        ...prev,
                                        page: prev.page + 1
                                    })}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </CardContent>
            </Card>
        </div>
    );
}
