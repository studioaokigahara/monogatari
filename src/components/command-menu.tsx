import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from "@/components/ui/command";
import { useCharacterContext } from "@/contexts/character";
import { db } from "@/database/monogatari-db";
import { useImageURL } from "@/hooks/use-image-url";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    BookMarked,
    FileText,
    Heart,
    Plug,
    Shapes,
    SlidersHorizontal,
    User,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";

export function CommandMenu() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (event: KeyboardEvent) => {
            if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const navigate = useNavigate();
    const selectItem = (pathname: string) => {
        void navigate({ to: pathname });
        setOpen(false);
    };

    const characters = useLiveQuery(() => db.characters.orderBy("data.name").toArray(), []);
    const characterImages = useImageURL(
        characters?.map((character) => {
            const avatar = character.data.assets.find((asset) => asset.name === "avatar");
            return {
                category: "character" as const,
                id: character.id,
                assets: character.data.assets,
                filename: avatar ? `avatar.${avatar.ext}` : undefined
            };
        })
    );

    const characterItems = characters?.map((character, index) => (
        <Link key={character.id} to="/characters/$id" params={{ id: character.id }}>
            <CommandItem
                onSelect={() => {
                    void navigate({ to: "/characters/$id", params: { id: character.id } });
                    setOpen(false);
                }}
                className="cursor-pointer"
            >
                <Avatar>
                    <AvatarImage
                        src={characterImages?.[index]}
                        alt={character.data.name}
                        className="object-cover"
                    />
                    <AvatarFallback>{character.data.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {character.data.name}
                {character.favorite === 1 && (
                    <Heart fill="currentColor" className="text-pink-400!" />
                )}
            </CommandItem>
        </Link>
    ));

    const personas = useLiveQuery(() => db.personas.orderBy("name").toArray(), []);
    const personaImages = useImageURL(
        personas?.map((persona) => ({
            category: "persona" as const,
            id: persona.id
        }))
    );

    const { setPersona } = useCharacterContext();
    const personaItems = personas?.map((persona, index) => (
        <CommandItem
            key={persona.id}
            onSelect={() => {
                setPersona(persona);
                setOpen(false);
            }}
        >
            <Avatar>
                <AvatarImage
                    src={personaImages?.[index]}
                    alt={persona.name}
                    className="object-cover"
                />
                <AvatarFallback>{persona.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            {persona.name}
        </CommandItem>
    ));

    return (
        <CommandDialog open={open} onOpenChange={setOpen} className="sm:max-w-md">
            <CommandInput placeholder="Search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem value="/characters" onSelect={selectItem}>
                        <Users />
                        <span>Characters</span>
                    </CommandItem>
                    <CommandItem value="/explore" onSelect={selectItem}>
                        <Shapes />
                        <span>Explore</span>
                    </CommandItem>
                    <CommandItem value="/personas" onSelect={selectItem}>
                        <User />
                        <span>Personas</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem value="/settings" onSelect={selectItem}>
                        <SlidersHorizontal />
                        <span>General</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="/settings/api" onSelect={selectItem}>
                        <Plug />
                        <span>API</span>
                        <CommandShortcut>⌘A</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="/settings/presets" onSelect={selectItem}>
                        <FileText />
                        <span>Presets</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="/settings/lorebooks" onSelect={selectItem}>
                        <BookMarked />
                        <span>Lorebooks</span>
                        <CommandShortcut>⌘L</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Characters">{characterItems}</CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Personas">{personaItems}</CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
