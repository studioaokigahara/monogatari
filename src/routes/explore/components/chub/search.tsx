import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SearchOptions } from "@/types/explore/chub";
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
    RotateCcw,
    Search as SearchIcon,
    Star,
    StarHalf,
    TextSelect,
    TrendingUp,
    User,
    UserPlus,
    UserSearch
} from "lucide-react";
import { useState, useTransition } from "react";

const namespaceOptions = [
    { label: "Characters", icon: <User />, value: "characters" },
    { label: "Lorebooks", icon: <BookOpenText />, value: "lorebooks" }
];

const itemsPerPageOptions = [8, 16, 24, 32, 40, 48, 64];

const sortOptions = [
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
];

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

    const handleSelect = (field: keyof SearchOptions, value: string | boolean) => {
        onSearchOptionsChange({
            [field]: value
        });
    };

    const [_isPending, startTransition] = useTransition();
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const formValues = SearchOptions.parse(Object.fromEntries(formData));

        startTransition(() => {
            onSearchOptionsChange({
                ...formValues,
                page: 1
            });
        });
    };

    const handleReset = (event: React.FormEvent<HTMLFormElement>) => {
        event.currentTarget.reset();
        startTransition(onReset);
    };

    const selectNamespace = namespaceOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    const selectItemsPerPage = itemsPerPageOptions.map((number) => (
        <SelectItem key={number} value={String(number)}>
            {number}
        </SelectItem>
    ));

    const selectSort = sortOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    return (
        <Card className="w-full border-none bg-transparent py-4 shadow-none">
            <CardContent>
                <form onReset={handleReset} onSubmit={handleSubmit}>
                    <Collapsible
                        open={isOpen}
                        onOpenChange={setIsOpen}
                        className="flex flex-row flex-wrap gap-2"
                    >
                        <ButtonGroup className="w-full">
                            <ButtonGroup className="grow">
                                <Input
                                    name="searchTerm"
                                    defaultValue={searchOptions.searchTerm}
                                    placeholder="Search..."
                                />
                                <Button type="submit" size="icon" variant="outline">
                                    <SearchIcon />
                                </Button>
                                <Button type="reset" size="icon" variant="outline">
                                    <RotateCcw />
                                </Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <CollapsibleTrigger asChild>
                                    <Button
                                        aria-label="Toggle Search Options"
                                        variant="outline"
                                        size="icon"
                                    >
                                        <FunnelPlus />
                                    </Button>
                                </CollapsibleTrigger>
                            </ButtonGroup>
                        </ButtonGroup>
                        <CollapsibleContent
                            forceMount
                            className={cn("w-full", isOpen ? "max-h-250" : "hidden max-h-0")}
                        >
                            <div className="mb-2 flex w-full gap-2">
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="creator">Creator</Label>
                                    <UserSearch className="absolute top-1/2 left-2 size-4 opacity-50" />
                                    <Input
                                        id="creator"
                                        className="pl-7"
                                        name="creator"
                                        placeholder="@creator"
                                        defaultValue={searchOptions.creator}
                                    />
                                </div>
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="includedTags">Included Tags</Label>
                                    <CopyPlus className="absolute top-1/2 left-2 size-4 opacity-50" />
                                    <Input
                                        id="includedTags"
                                        className="pl-7"
                                        name="includedTags"
                                        placeholder="tag1, tag2, tag3"
                                        defaultValue={searchOptions.includedTags}
                                    />
                                </div>
                                <div className="relative grow space-y-1">
                                    <Label htmlFor="excludedTags">Excluded Tags</Label>
                                    <CopyMinus className="absolute top-1/2 left-2 size-4 opacity-50" />
                                    <Input
                                        id="excludedTags"
                                        className="pl-7"
                                        name="excludedTags"
                                        placeholder="tag1, tag2, tag3"
                                        defaultValue={searchOptions.excludedTags}
                                    />
                                </div>
                            </div>
                            <div className="flex w-full flex-wrap gap-2">
                                <div className="grow space-y-1">
                                    <Label htmlFor="namespace">Namespace</Label>
                                    <Select
                                        name="namespace"
                                        defaultValue="characters"
                                        value={searchOptions.namespace}
                                        onValueChange={(value) => {
                                            handleSelect("namespace", value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select namespace" />
                                        </SelectTrigger>
                                        <SelectContent>{selectNamespace}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="itemsPerPage">Items Per Page</Label>
                                    <Select
                                        name="itemsPerPage"
                                        value={searchOptions.itemsPerPage.toString()}
                                        onValueChange={(value) => {
                                            handleSelect("itemsPerPage", value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Items per page" />
                                        </SelectTrigger>
                                        <SelectContent>{selectItemsPerPage}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="sort">Sort By</Label>
                                    <Select
                                        name="sort"
                                        value={searchOptions.sort}
                                        onValueChange={(value) => {
                                            handleSelect("sort", value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>{selectSort}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="sortDirection">Sort Direction</Label>
                                    <Select
                                        name="sortAscending"
                                        value={searchOptions.sortAscending ? "asc" : "desc"}
                                        onValueChange={(value) => {
                                            handleSelect("sortAscending", value === "asc");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort direction" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="desc">
                                                <Icon iconNode={stairsArrowDownLeft} />
                                                Descending
                                            </SelectItem>
                                            <SelectItem value="asc">
                                                <Icon iconNode={stairsArrowUpRight} />
                                                Ascending
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Label htmlFor="nsfw">
                                        NSFW
                                        <Switch
                                            id="nsfw"
                                            name="nsfw"
                                            checked={searchOptions.nsfw}
                                            onCheckedChange={(checked) =>
                                                onSearchOptionsChange({
                                                    nsfw: checked
                                                })
                                            }
                                        />
                                    </Label>
                                    <Label htmlFor="inclusiveOr">
                                        Match Any Tag
                                        <Switch
                                            id="inclusiveOr"
                                            name="inclusiveOr"
                                            checked={searchOptions.inclusiveOr}
                                            onCheckedChange={(checked) =>
                                                onSearchOptionsChange({
                                                    inclusiveOr: checked
                                                })
                                            }
                                        />
                                    </Label>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </form>
            </CardContent>
        </Card>
    );
}
