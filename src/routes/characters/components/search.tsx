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
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { usePaginationRange } from "@/hooks/use-pagination-range";
import { characterSearchSchema, countCharacters } from "@/lib/character/search";
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
    InfinityIcon,
    SearchIcon
} from "lucide-react";
import { useState } from "react";

const sortOptions = [
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

const limitOptions = [12, 24, 36, 48, 60, 1536];

export function Search() {
    const { page, sort, limit, search } = useSearch({ from: "/characters/" });
    const navigate = useNavigate({ from: "/characters/" });
    const characterCount = useLiveQuery(() => countCharacters(search), [search], 0);
    const totalPages = Math.max(1, Math.ceil(characterCount / limit));

    const changeSort = (value: string) => {
        void navigate({
            search: () => ({ sort: value as characterSearchSchema["sort"] })
        });
    };

    const changeLimit = (value: string) => {
        void navigate({
            search: () => ({ limit: Number(value) })
        });
    };

    const [input, setInput] = useState(search);

    const debouncedSearch = debounce((value: string) => {
        void navigate({
            search: () => ({ search: value.trim() })
        });
    }, 250);

    const updateSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setInput(value);
        debouncedSearch(value);
    };

    const sortItems = sortOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    const limitItems = limitOptions.map((option) => (
        <SelectItem key={option} value={String(option)}>
            {option === 1536 ? (
                <>
                    <InfinityIcon />
                    All
                </>
            ) : (
                <>
                    <Hash />
                    {String(option)}
                </>
            )}
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
        <div className="sticky top-2 z-50 w-full">
            <Card className="w-full bg-background/66 pt-4 pb-2 backdrop-blur">
                <CardContent className="flex flex-col gap-2 px-4">
                    <ButtonGroup className="w-full">
                        <Select value={sort} onValueChange={changeSort}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort By..." />
                            </SelectTrigger>
                            <SelectContent>{sortItems}</SelectContent>
                        </Select>
                        <Select value={String(limit)} onValueChange={changeLimit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Cards per page..." />
                            </SelectTrigger>
                            <SelectContent>{limitItems}</SelectContent>
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
