import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { useCharacterContext } from "@/hooks/use-character-context";
import { useImageURL } from "@/hooks/use-image-url";
import { useNavigate } from "@tanstack/react-router";
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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from "./ui/command";

export function CommandMenu() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const navigate = useNavigate();

    const navigateToPage = (pathname: string) => {
        void navigate({ to: pathname });
        setOpen(false);
    };

    const characters = useLiveQuery(
        () =>
            db.characters
                .orderBy("data.name")
                .filter((character: Character) =>
                    character.data.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                )
                .toArray(),
        [searchTerm]
    );

    const characterImages = useImageURL(
        characters?.map((character) => ({
            category: "character" as const,
            id: character.id,
            assets: character.data.assets
        }))
    );

    const selectCharacter = (characterName: string) => {
        const character = characters?.find(
            (character) => character.data.name === characterName
        );

        if (character) {
            navigateToPage(`/characters/${character.id}`);
        }
    };

    const characterItems = characters?.map((character, index) => (
        <CommandItem key={character.id} onSelect={selectCharacter}>
            <Avatar>
                <AvatarImage
                    src={characterImages?.[index]}
                    alt={character.data.name}
                    className="object-cover"
                />
                <AvatarFallback>
                    {character.data.name.slice(0, 2)}
                </AvatarFallback>
            </Avatar>
            <span>{character.data.name}</span>
            {character.favorite === 1 && (
                <Heart fill="currentColor" className="text-pink-400" />
            )}
        </CommandItem>
    ));

    const personas = useLiveQuery(
        () =>
            db.personas
                .filter((persona) =>
                    persona.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                )
                .toArray(),
        [searchTerm]
    );

    const personaImages = useImageURL(
        personas?.map((persona) => ({
            category: "persona" as const,
            id: persona.id
        }))
    );

    const { setPersona } = useCharacterContext();
    const selectPersona = (personaName: string) => {
        const persona = personas?.find(
            (persona) => persona.name === personaName
        );

        if (persona) {
            setPersona(persona);
            setOpen(false);
        }
    };

    const personaItems = personas?.map((persona, index) => (
        <CommandItem key={persona.id} onSelect={selectPersona}>
            <Avatar>
                <AvatarImage
                    src={personaImages?.[index]}
                    alt={persona.name}
                    className="object-cover"
                />
                <AvatarFallback>{persona.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span>{persona.name}</span>
        </CommandItem>
    ));

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Type a command or search..."
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem value="/characters" onSelect={navigateToPage}>
                        <Users />
                        <span>Characters</span>
                    </CommandItem>
                    <CommandItem value="/explore" onSelect={navigateToPage}>
                        <Shapes />
                        <span>Explore</span>
                    </CommandItem>
                    <CommandItem value="/personas" onSelect={navigateToPage}>
                        <User />
                        <span>Personas</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem value="/settings" onSelect={navigateToPage}>
                        <SlidersHorizontal />
                        <span>General</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        value="/settings/api"
                        onSelect={navigateToPage}
                    >
                        <Plug />
                        <span>API</span>
                        <CommandShortcut>⌘A</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        value="/settings/presets"
                        onSelect={navigateToPage}
                    >
                        <FileText />
                        <span>Presets</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        value="/settings/lorebooks"
                        onSelect={navigateToPage}
                    >
                        <BookMarked />
                        <span>Lorebooks</span>
                        <CommandShortcut>⌘L</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Characters">
                    {characterItems}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Personas">{personaItems}</CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
