import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import { useCharacterContext } from "@/contexts/character-context";
import { db } from "@/database/monogatari-db";
import { useImageURL } from "@/hooks/use-image-url";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronsUpDown, UserPen, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

export function PersonaSwitcher() {
    const [open, setOpen] = useState(false);

    const { persona, setPersona } = useCharacterContext();
    const { isMobile } = useSidebar();

    const personas = useLiveQuery(() => db.personas.toArray(), [], []);

    const imageURLs = useImageURL(
        personas?.map((persona) => ({
            category: "persona" as const,
            id: persona.id
        }))
    );

    useEffect(() => {
        if (personas.length > 0) {
            if (!persona || !personas.find((p) => p.id === persona.id)) {
                setPersona(personas[0]);
            }
        }
    }, [personas, persona, setPersona]);

    const activeIndex = personas.findIndex((p) => p.id === persona?.id);
    const activeImageURL =
        activeIndex !== -1 && Array.isArray(imageURLs)
            ? imageURLs[activeIndex]
            : "";

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.metaKey && /^([0-9])$/.test(e.key)) {
                let index = parseInt(e.key, 10) - 1;
                if (e.key === "0") index = 9;
                if (index >= 0 && index < personas.length) {
                    e.preventDefault();
                    setPersona(personas[index]);
                    setOpen(false);
                }
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [open, personas, setPersona]);

    const personaDropdownItems = personas.map((persona, index) => (
        <DropdownMenuItem
            key={persona.id}
            onClick={() => setPersona(persona)}
            className="gap-2 p-2"
        >
            <div className="flex size-6 items-center justify-center rounded-md border">
                <Avatar className="size-8 rounded-4xl">
                    <AvatarImage
                        src={Array.isArray(imageURLs) ? imageURLs[index] : ""}
                        alt={persona.name}
                        className="object-cover"
                    />
                    <AvatarFallback className="rounded-4xl">
                        {persona.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>
            {persona.name}
            <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
        </DropdownMenuItem>
    ));

    if (personas.length === 0 || !persona) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link to="/personas">
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar>
                                <AvatarFallback>?</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    I AM ERROR.
                                </span>
                            </div>
                            <UserPlus className="ml-auto" />
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu open={open} onOpenChange={setOpen}>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8">
                                <AvatarImage
                                    src={activeImageURL}
                                    alt={persona.name}
                                    className="object-cover"
                                />
                                <AvatarFallback>
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
                        {personaDropdownItems}
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
