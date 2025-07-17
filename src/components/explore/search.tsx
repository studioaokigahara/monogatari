import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import type { SearchOptions } from "@/types/chub";
import { stairsArrowDownLeft, stairsArrowUpRight } from "@lucide/lab";
import {
    BookOpenText,
    Cake,
    Clock,
    CopyMinus,
    CopyPlus,
    Dices,
    Download,
    Fingerprint,
    FunnelPlus,
    Hash,
    Heart,
    Icon,
    PencilLine,
    Search as SearchIcon,
    Star,
    StarHalf,
    TextSelect,
    TrendingUp,
    User,
    UserPlus,
    UserSearch
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "../ui/switch";

interface SearchPanelProps {
    searchOptions: SearchOptions;
    onSearchOptionsChange: (options: Partial<SearchOptions>) => void;
    onReset: () => void;
}

export default function Search({
    searchOptions,
    onSearchOptionsChange,
    onReset
}: SearchPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const creatorRef = useRef<HTMLInputElement>(null);
    const incTagsRef = useRef<HTMLInputElement>(null);
    const excTagsRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (
            !searchRef.current ||
            !creatorRef.current ||
            !incTagsRef.current ||
            !excTagsRef.current
        )
            return;
        searchRef.current.value = searchOptions.searchTerm;
        creatorRef.current.value = searchOptions.creator;
        incTagsRef.current.value = searchOptions.includedTags.join(", ");
        excTagsRef.current.value = searchOptions.excludedTags.join(", ");
    }, [
        searchOptions.searchTerm,
        searchOptions.creator,
        searchOptions.includedTags.join(),
        searchOptions.excludedTags.join()
    ]);

    const handleSelect =
        (field: keyof SearchOptions, parser?: (value: string) => any) =>
        (value: string) => {
            onSearchOptionsChange({
                [field]: parser ? parser(value) : value
            });
        };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const term = searchRef.current!.value;
        const creator = creatorRef.current!.value;
        const inc = incTagsRef
            .current!.value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const exc = excTagsRef
            .current!.value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        onSearchOptionsChange({
            searchTerm: term,
            creator: creator,
            includedTags: inc,
            excludedTags: exc,
            page: 1
        });
    };

    const handleReset = () => {
        formRef.current!.reset();
        onReset();
    };

    const namespaceOptions = useMemo(
        () => [
            { label: "Characters", icon: <User />, value: "characters" },
            { label: "Lorebooks", icon: <BookOpenText />, value: "lorebooks" }
        ],
        []
    );

    const itemsPerPageOptions = useMemo(() => [8, 16, 24, 32, 40, 48, 64], []);

    const sortOptions = useMemo(
        () => [
            {
                label: "Trending",
                icon: <TrendingUp />,
                value: "trending_downloads"
            },
            { label: "Downloads", icon: <Download />, value: "download_count" },
            {
                label: "Stars",
                icon: <Star fill="currentColor" />,
                value: "star_count"
            },
            { label: "ID", icon: <Fingerprint />, value: "id" },
            {
                label: "Rating",
                icon: <StarHalf fill="currentColor" />,
                value: "rating"
            },
            { label: "Rating Count", icon: <Hash />, value: "rating_count" },
            {
                label: "Recently Updated",
                icon: <Clock />,
                value: "last_activity_at"
            },
            {
                label: "Favorites",
                icon: <Heart fill="currentColor" />,
                value: "n_favorites"
            },
            { label: "Creation Date", icon: <Cake />, value: "created_at" },
            { label: "Name", icon: <PencilLine />, value: "name" },
            { label: "Token Count", icon: <TextSelect />, value: "n_tokens" },
            { label: "Newcomers", icon: <UserPlus />, value: "newcomer" },
            { label: "Random", icon: <Dices />, value: "random" }
        ],
        []
    );

    return (
        <Card className="w-full -mb-2 py-4 z-1">
            <CardContent>
                <form ref={formRef} onSubmit={handleSubmit}>
                    <Collapsible
                        open={isOpen}
                        onOpenChange={setIsOpen}
                        className="flex flex-row flex-wrap gap-2"
                    >
                        <div className="flex w-full gap-2 relative">
                            <div className="grow space-y-1">
                                <Label htmlFor="searchTerm">Search</Label>
                                <SearchIcon className="absolute top-1/2 left-2 size-4 opacity-50" />
                                <Input
                                    id="searchTerm"
                                    className="pl-7"
                                    name="searchTerm"
                                    placeholder="Search..."
                                    defaultValue={searchOptions.searchTerm}
                                    ref={searchRef}
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <Button>Search</Button>
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    variant="outline"
                                >
                                    Reset
                                </Button>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost">
                                        <FunnelPlus className="size-4" />
                                        <span className="sr-only">Toggle</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        <CollapsibleContent
                            forceMount
                            className={`w-full ${isOpen ? "max-h-[999px]" : "max-h-0 hidden"}`}
                        >
                            <div className="flex w-full gap-2 mb-2">
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="creator">Creator</Label>
                                    <UserSearch className="absolute top-1/2 left-2 size-4  opacity-50" />
                                    <Input
                                        id="creator"
                                        className="pl-7"
                                        name="creator"
                                        placeholder="Creator"
                                        defaultValue={searchOptions.creator}
                                        ref={creatorRef}
                                    />
                                </div>
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="includedTags">
                                        Included Tags
                                    </Label>
                                    <CopyPlus className="absolute top-1/2 left-2 size-4 opacity-50" />
                                    <Input
                                        id="includedTags"
                                        className="pl-7"
                                        name="includedTags"
                                        placeholder="tag1, tag2, tag3"
                                        defaultValue={searchOptions.includedTags.join(
                                            ", "
                                        )}
                                        ref={incTagsRef}
                                    />
                                </div>
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="excludedTags">
                                        Excluded Tags
                                    </Label>
                                    <CopyMinus className="absolute top-1/2 left-2 size-4 opacity-50" />
                                    <Input
                                        id="excludedTags"
                                        className="pl-7"
                                        name="excludedTags"
                                        placeholder="tag1, tag2, tag3"
                                        defaultValue={searchOptions.excludedTags.join(
                                            ", "
                                        )}
                                        ref={excTagsRef}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap w-full gap-2">
                                <div className="grow space-y-1">
                                    <Label htmlFor="namespace">Namespace</Label>
                                    <Select
                                        defaultValue="characters"
                                        value={searchOptions.namespace}
                                        onValueChange={handleSelect(
                                            "namespace"
                                        )}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select namespace" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {namespaceOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.icon}
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="itemsPerPage">
                                        Items Per Page
                                    </Label>
                                    <Select
                                        value={searchOptions.itemsPerPage.toString()}
                                        onValueChange={handleSelect(
                                            "itemsPerPage"
                                        )}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Items per page" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {itemsPerPageOptions.map((n) => (
                                                <SelectItem
                                                    key={n}
                                                    value={String(n)}
                                                >
                                                    {n}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="sort">Sort By</Label>
                                    <Select
                                        value={searchOptions.sort}
                                        onValueChange={handleSelect("sort")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sortOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.icon}
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="sortDirection">
                                        Sort Direction
                                    </Label>
                                    <Select
                                        value={
                                            searchOptions.sortAscending
                                                ? "asc"
                                                : "desc"
                                        }
                                        onValueChange={handleSelect(
                                            "sortAscending",
                                            (value) => value === "asc"
                                        )}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort direction" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="desc">
                                                <Icon
                                                    iconNode={
                                                        stairsArrowDownLeft
                                                    }
                                                />
                                                Descending
                                            </SelectItem>
                                            <SelectItem value="asc">
                                                <Icon
                                                    iconNode={
                                                        stairsArrowUpRight
                                                    }
                                                />
                                                Ascending
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <Label htmlFor="nsfw">NSFW</Label>
                                    <Switch
                                        id="nsfw"
                                        name="nsfw"
                                        checked={searchOptions.nsfw}
                                        onCheckedChange={(checked) =>
                                            onSearchOptionsChange({
                                                nsfw: checked === true
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </form>
            </CardContent>
        </Card>
    );
}
