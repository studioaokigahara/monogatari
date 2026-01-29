import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { Lorebook } from "@/database/schema/lorebook";
import { cn, downloadFile, generateCuid2 } from "@/lib/utils";
import { BookUpIcon, ListPlusIcon, Trash2Icon } from "lucide-react";

interface Props {
    lorebooks: Lorebook[];
    selectedLorebook?: Lorebook;
    lorebookID: string;
    setLorebookID: (id: string) => void;
    entryIndex: number;
    setEntryIndex: (index: number) => void;
}

export function LorebookList({
    lorebooks,
    selectedLorebook,
    lorebookID,
    setLorebookID,
    entryIndex,
    setEntryIndex
}: Props) {
    const lorebookItems = lorebooks.map((lorebook) => ({
        value: lorebook.id,
        label: lorebook.data.name ?? "Untitled"
    }));

    const selectItems = lorebookItems.map((item) => (
        <SelectItem key={item.value} value={item.value}>
            {item.label}
        </SelectItem>
    ));

    const deleteEntry = async (index: number) => {
        await selectedLorebook?.update({
            data: {
                ...selectedLorebook.data,
                entries: selectedLorebook.data.entries.toSpliced(index, 1)
            }
        });
        setEntryIndex(Math.max(0, index - 1));
    };

    const lorebookEntries = selectedLorebook?.data.entries.map((entry, index) => (
        <SidebarMenuItem key={entry.id || index}>
            <SidebarMenuButton isActive={index === entryIndex} onClick={() => setEntryIndex(index)}>
                <span className={cn("truncate", !entry.enabled ? "max-w-[19ch]" : "")}>
                    {entry.name || "Untitled"}
                </span>
                {!entry.enabled && (
                    <SidebarMenuBadge className="ml-2 rounded bg-destructive/20 px-1 py-0.5 text-destructive">
                        Disabled
                    </SidebarMenuBadge>
                )}
            </SidebarMenuButton>
            <SidebarMenuAction showOnHover onClick={() => deleteEntry(index)}>
                <Trash2Icon className="text-destructive/90 hover:text-destructive" />
                <span className="sr-only">Delete Entry</span>
            </SidebarMenuAction>
        </SidebarMenuItem>
    ));

    const addEntry = async () => {
        const newEntry: Lorebook["data"]["entries"][number] = {
            id: generateCuid2(),
            name: "",
            comment: "",
            keys: [""],
            secondary_keys: undefined,
            position: "before_char",
            priority: 0,
            content: "",
            enabled: true,
            case_sensitive: false,
            use_regex: false,
            constant: false,
            selective: false,
            extensions: {},
            insertion_order: 0
        };
        await selectedLorebook?.update({
            data: {
                ...selectedLorebook.data,
                entries: [...selectedLorebook.data.entries, newEntry]
            }
        });
        setEntryIndex(Math.max(0, (selectedLorebook?.data.entries.length ?? 1) - 1));
    };

    const exportLorebook = () => {
        const lorebook = selectedLorebook?.serialize();
        const json = JSON.stringify(lorebook);
        const file = new File([json], `${lorebook?.data.name}.json`, {
            type: "application/json"
        });
        downloadFile(file);
    };

    const deleteLorebook = async () => {
        await selectedLorebook?.delete();
        setLorebookID(lorebooks[lorebooks.length - 1].id);
    };

    return (
        <Sidebar collapsible="none" className="w-full sm:w-(--sidebar-width)">
            <SidebarHeader className="pt-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Select
                            items={lorebookItems}
                            value={lorebookID}
                            onValueChange={(value) => setLorebookID(value as string)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Lorebook..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>{selectItems}</SelectGroup>
                            </SelectContent>
                        </Select>
                    </SidebarMenuItem>
                    {selectedLorebook && (
                        <>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={exportLorebook}>
                                    <BookUpIcon />
                                    Export Lorebook
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={deleteLorebook}
                                    className="hover:bg-destructive/20 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
                                >
                                    <Trash2Icon className="text-destructive" />
                                    Delete Lorebook
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </>
                    )}
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator className="mx-0" />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {selectedLorebook && (
                                <SidebarMenuItem className="sticky top-0 z-1 -mt-2 rounded-none bg-card pt-2">
                                    <SidebarMenuButton onClick={addEntry}>
                                        <ListPlusIcon />
                                        Add Entry
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            {lorebookEntries}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
