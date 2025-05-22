import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { useCharacterContext } from "@/contexts/character-context";
import { db } from "@/database/database";
import { PersonaRecord } from "@/database/schema/persona";
import { useImageURL } from "@/hooks/use-image-url";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronsUpDown, UserPen } from "lucide-react";
import { useEffect, useMemo } from "react";

export function PersonaSwitcher() {
    // Retrieve the current persona from context
    const { persona, setPersona } = useCharacterContext();
    // Live query (defaults to empty array to avoid undefined)
    const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
    const { isMobile } = useSidebar();

    // Memoize the array of persona blobs, which helps to avoid re-renders.
    const personaBlobs = useMemo(
        () => personas.map((personaItem) => personaItem.blob),
        [personas],
    );
    const imageURLs = useImageURL(personaBlobs);

    // If the context has no persona set, but we have personas, set the context to the first persona
    useEffect(() => {
        if (personas.length > 0) {
            if (!persona || !personas.find((p) => p.id === persona.id)) {
                setPersona(personas[0]);
            }
        }
    }, [personas, persona, setPersona]);

    // If no personas or no active persona in context, do not render anything
    if (personas.length === 0 || !persona) {
        return null;
    }

    // Determine the index of the current persona within the list,
    // then use that index to retrieve the corresponding image URL.
    const activeIndex = personas.findIndex((p) => p.id === persona.id);
    const activeImageURL =
        activeIndex !== -1 && Array.isArray(imageURLs)
            ? imageURLs[activeIndex]
            : "";

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8 rounded-4xl">
                                <AvatarImage
                                    src={activeImageURL}
                                    alt={persona.name}
                                />
                                <AvatarFallback className="rounded-4xl">
                                    {persona.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {persona.name}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Personas
                        </DropdownMenuLabel>
                        {personas.map((p, index) => (
                            <DropdownMenuItem
                                key={p.id}
                                onClick={() => setPersona(p)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border">
                                    <Avatar className="size-8 rounded-4xl">
                                        <AvatarImage
                                            src={
                                                Array.isArray(imageURLs)
                                                    ? imageURLs[index]
                                                    : ""
                                            }
                                            alt={p.name}
                                        />
                                        <AvatarFallback className="rounded-4xl">
                                            {p.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                {p.name}
                                <DropdownMenuShortcut>
                                    ⌘{index + 1}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <Link to="/personas">
                            <DropdownMenuItem className="gap-2 p-2 cursor-pointer">
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <UserPen className="size-4" />
                                </div>
                                <div className="text-muted-foreground font-medium">
                                    Edit Personas
                                </div>
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
