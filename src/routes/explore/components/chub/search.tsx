import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
    Select,
    SelectContent,
    SelectGroup,
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
    CopyMinusIcon,
    CopyPlusIcon,
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
    UserSearchIcon
} from "lucide-react";
import { useState } from "react";

const NAMESPACE_OPTIONS = [
    { label: "Characters", icon: <User />, value: "characters" },
    { label: "Lorebooks", icon: <BookOpenText />, value: "lorebooks" }
];

const ITEMS_PER_PAGE_OPTIONS = [8, 16, 24, 32, 40, 48, 64];

const SORT_OPTIONS = [
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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const formValues = SearchOptions.parse(Object.fromEntries(formData));

        onSearchOptionsChange({
            ...formValues,
            page: 1
        });
    };

    const handleReset = (event: React.FormEvent<HTMLFormElement>) => {
        event.currentTarget.reset();
        onReset();
    };

    const selectNamespace = NAMESPACE_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    const selectItemsPerPage = ITEMS_PER_PAGE_OPTIONS.map((number) => (
        <SelectItem key={number} value={String(number)}>
            {number}
        </SelectItem>
    ));

    const selectSort = SORT_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option}>
            {option.icon}
            {option.label}
        </SelectItem>
    ));

    return (
        <Card size="sm" className="w-full bg-background/66 backdrop-blur">
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
                                <CollapsibleTrigger
                                    render={
                                        <Button
                                            aria-label="Toggle Search Options"
                                            variant="outline"
                                            size="icon"
                                        />
                                    }
                                >
                                    <FunnelPlus />
                                </CollapsibleTrigger>
                            </ButtonGroup>
                        </ButtonGroup>
                        <CollapsibleContent
                            keepMounted
                            className={cn("w-full", isOpen ? "max-h-250" : "hidden max-h-0")}
                        >
                            <FieldGroup className="mb-2 flex w-full gap-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <Field>
                                        <FieldLabel htmlFor="creator">Creator</FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id="creator"
                                                name="creator"
                                                placeholder="@creator"
                                                defaultValue={searchOptions.creator}
                                            />
                                            <InputGroupAddon>
                                                <UserSearchIcon />
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="includedTags">
                                            Included Tags
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id="includedTags"
                                                name="includedTags"
                                                placeholder="tag1, tag2, tag3"
                                                defaultValue={searchOptions.includedTags}
                                            />
                                            <InputGroupAddon>
                                                <CopyPlusIcon />
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="excludedTags">
                                            Excluded Tags
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id="excludedTags"
                                                name="excludedTags"
                                                placeholder="tag1, tag2, tag3"
                                                defaultValue={searchOptions.excludedTags}
                                            />
                                            <InputGroupAddon>
                                                <CopyMinusIcon />
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <Field>
                                        <FieldLabel htmlFor="namespace">Namespace</FieldLabel>
                                        <Select
                                            name="namespace"
                                            defaultValue="characters"
                                            value={searchOptions.namespace}
                                            onValueChange={(value) => {
                                                handleSelect("namespace", value as string);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select namespace">
                                                    {(value) => {
                                                        const item = NAMESPACE_OPTIONS.find(
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
                                                <SelectGroup>{selectNamespace}</SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="itemsPerPage">
                                            Items Per Page
                                        </FieldLabel>
                                        <Select
                                            name="itemsPerPage"
                                            value={searchOptions.itemsPerPage.toString()}
                                            onValueChange={(value) => {
                                                handleSelect("itemsPerPage", value as string);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Items per page" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>{selectItemsPerPage}</SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="sort">Sort By</FieldLabel>
                                        <Select
                                            name="sort"
                                            value={searchOptions.sort}
                                            onValueChange={(value) => {
                                                handleSelect("sort", value as string);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sort by">
                                                    {(value) => {
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
                                                <SelectGroup>{selectSort}</SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="sortDirection">
                                            Sort Direction
                                        </FieldLabel>
                                        <Select
                                            name="sortAscending"
                                            value={searchOptions.sortAscending ? "asc" : "desc"}
                                            onValueChange={(value) => {
                                                handleSelect("sortAscending", value === "asc");
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sort direction">
                                                    {(value) =>
                                                        value === "desc" ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Icon
                                                                    iconNode={stairsArrowDownLeft}
                                                                />
                                                                Descending
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5">
                                                                <Icon
                                                                    iconNode={stairsArrowUpRight}
                                                                />
                                                                Ascending
                                                            </span>
                                                        )
                                                    }
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="desc">
                                                        <Icon iconNode={stairsArrowDownLeft} />
                                                        Descending
                                                    </SelectItem>
                                                    <SelectItem value="asc">
                                                        <Icon iconNode={stairsArrowUpRight} />
                                                        Ascending
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <div className="mt-4 flex w-fit items-center gap-2">
                                    <Field>
                                        <FieldLabel htmlFor="nsfw" className="bg-[unset]!">
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
                                        </FieldLabel>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="inclusiveOr" className="bg-[unset]!">
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
                                        </FieldLabel>
                                    </Field>
                                </div>
                            </FieldGroup>
                        </CollapsibleContent>
                    </Collapsible>
                </form>
            </CardContent>
        </Card>
    );
}
