import {
    Select,
    SelectContent,
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
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { Lorebook } from "@/database/schema/lorebook";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { cn } from "@/lib/utils";
import { BookDown, BookPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
    lorebooks: Lorebook[];
    selectedLorebook?: Lorebook;
    lorebookState: [string, React.Dispatch<React.SetStateAction<string>>];
    entryState: [number, React.Dispatch<React.SetStateAction<number>>];
}

export function LorebookList({
    lorebooks,
    selectedLorebook,
    lorebookState,
    entryState
}: Props) {
    const [lorebookID, setLorebookID] = lorebookState;
    const [entryIndex, setEntryIndex] = entryState;

    const createNewLorebook = async () => {
        const lorebook = new Lorebook();
        await lorebook.save();
        setLorebookID(lorebook.id);
        setEntryIndex(0);
    };

    const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await Lorebook.import(file);
            toast.success("Lorebook imported successfully!");
        } catch (error) {
            console.error("Import failed:", error);
            toast.error("Unable to import that file. Is it valid JSON?");
        }
    };

    const { browse, input } = useFileDialog({
        accept: ".json",
        onChange: handleFile
    });

    const lorebookItems = lorebooks.map((lorebook) => (
        <SelectItem key={lorebook.id} value={lorebook.id}>
            <span>{lorebook.data.name || "Untitled"}</span>
        </SelectItem>
    ));

    const lorebookEntries = selectedLorebook?.data.entries.map(
        (entry, index) => (
            <SidebarMenuItem key={entry.id || index}>
                <SidebarMenuButton
                    className="cursor-default"
                    isActive={index === entryIndex}
                    onClick={() => setEntryIndex(index)}
                >
                    <span
                        className={cn(
                            "truncate",
                            !entry.enabled ? "max-w-[19ch]" : ""
                        )}
                    >
                        {entry.name || "Untitled"}
                    </span>
                    {!entry.enabled && (
                        <SidebarMenuBadge className="bg-destructive/20 text-destructive px-1 py-0.5 ml-2 rounded">
                            Disabled
                        </SidebarMenuBadge>
                    )}
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    );

    return (
        <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={createNewLorebook}>
                            <BookPlus />
                            New Lorebook
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={browse}>
                            {input}
                            <BookDown />
                            Import Lorebook
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Select
                            value={lorebookID}
                            onValueChange={(value) => setLorebookID(value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Lorebook..." />
                            </SelectTrigger>
                            <SelectContent>{lorebookItems}</SelectContent>
                        </Select>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator className="mx-0" />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>{lorebookEntries}</SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
