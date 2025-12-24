import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@/components/ui/input-group";
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
import { CharacterArchiveQuery } from "@/types/explore/charchive";
import { stairsArrowDownLeft, stairsArrowUpRight } from "@lucide/lab";
import {
    Cake,
    Diff,
    Download,
    FunnelPlus,
    Icon,
    Package,
    PencilLine,
    RotateCcw,
    SearchIcon
} from "lucide-react";
import { useRef, useState } from "react";
import { SelectExploreProvider } from "../select-provider";

interface Props {
    query: CharacterArchiveQuery;
    updateQuery: (query: Partial<CharacterArchiveQuery>) => void;
    resetQuery: () => void;
}

export function CharacterArchiveSearch({
    query,
    updateQuery,
    resetQuery
}: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const formRef = useRef<HTMLFormElement>(null);
    const queryRef = useRef<HTMLInputElement>(null);
    const comparisonRef = useRef<HTMLInputElement>(null);

    const countOptions = [16, 32];
    const sortOptions = [
        { label: "Creation Date", icon: <Cake />, value: "created" },
        { label: "Update Date", icon: <PencilLine />, value: "updated" },
        { label: "Archive Date", icon: <Package />, value: "added" },
        { label: "Downloads", icon: <Download />, value: "downloads" }
    ];

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        updateQuery({
            query: queryRef.current!.value,
            page: 1,
            comparison: comparisonRef.current?.value ?? undefined
        });
    };

    const handleReset = () => {
        formRef.current!.reset();
        resetQuery();
    };

    return (
        <Card className="w-full py-4 bg-transparent border-none shadow-none">
            <CardContent>
                <form ref={formRef} onSubmit={handleSubmit}>
                    <Collapsible
                        open={isOpen}
                        onOpenChange={setIsOpen}
                        className="flex flex-row flex-wrap gap-2"
                    >
                        <ButtonGroup className="w-full">
                            <ButtonGroup className="grow">
                                <SelectExploreProvider />
                                <Input
                                    ref={queryRef}
                                    placeholder="Search..."
                                    defaultValue={query.query}
                                />
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button type="submit" size="icon">
                                    <SearchIcon />
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    size="icon"
                                >
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
                            className={cn(
                                "w-full space-y-1",
                                isOpen ? "max-h-250" : "max-h-0 hidden"
                            )}
                        >
                            <div className="flex w-full gap-2 relative">
                                <div className="grow space-y-1">
                                    <Label htmlFor="page">Page</Label>
                                    <Input
                                        id="page"
                                        name="page"
                                        type="number"
                                        value={query.page}
                                        className="w-min"
                                        onChange={(e) =>
                                            updateQuery({
                                                page: Number(e.target.value)
                                            })
                                        }
                                    />
                                </div>
                                <div className="grow space-y-1">
                                    <Label htmlFor="itemsPerPage">
                                        Items Per Page
                                    </Label>
                                    <Select
                                        value={query.count.toString()}
                                        onValueChange={(value) =>
                                            updateQuery({
                                                count: Number(value)
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Items per page" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countOptions.map((n) => (
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
                                        defaultValue={"created"}
                                        onValueChange={(value) =>
                                            updateQuery({
                                                "sort-key": value as
                                                    | "created"
                                                    | "updated"
                                                    | "added"
                                                    | "downloads"
                                            })
                                        }
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
                                        defaultValue={"asc"}
                                        onValueChange={(value) =>
                                            updateQuery({
                                                "sort-dir": value as
                                                    | "asc"
                                                    | "desc"
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort direction" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asc">
                                                <Icon
                                                    iconNode={
                                                        stairsArrowUpRight
                                                    }
                                                />
                                                Ascending
                                            </SelectItem>
                                            <SelectItem value="desc">
                                                <Icon
                                                    iconNode={
                                                        stairsArrowDownLeft
                                                    }
                                                />
                                                Descending
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <Label htmlFor="language-search">
                                        Natural Language Search
                                        <Switch
                                            id="language-search"
                                            name="language-search"
                                            onCheckedChange={(checked) =>
                                                updateQuery({
                                                    natural: checked === true
                                                })
                                            }
                                        />
                                    </Label>
                                    <Label htmlFor="exclude-forks">
                                        Exclude Forks
                                        <Switch
                                            id="inclusiveOr"
                                            name="inclusiveOr"
                                            checked={query.forks}
                                            onCheckedChange={(checked) =>
                                                updateQuery({
                                                    forks: checked === true
                                                })
                                            }
                                        />
                                    </Label>
                                </div>
                            </div>
                            <div className="flex w-full relative">
                                <div className="grow space-y-1">
                                    <Label htmlFor="comparison">
                                        Comparison
                                    </Label>
                                    <InputGroup>
                                        <InputGroupInput
                                            id="comparison"
                                            placeholder="Key (= > >= < <=) Value"
                                            defaultValue={query.comparison}
                                        />
                                        <InputGroupAddon>
                                            <Diff />
                                        </InputGroupAddon>
                                    </InputGroup>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </form>
            </CardContent>
        </Card>
    );
}
