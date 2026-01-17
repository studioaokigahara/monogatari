import { CharacterContext } from "@/contexts/character";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { useSettings } from "@/hooks/use-settings";
import { useLoaderData } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettings();
    const [character, setCharacter] = useState<Character>();

    const personas = useLoaderData({ from: "__root__" });
    const initialPersona = personas.find((persona) => persona.id === settings.persona);
    const [persona, setPersona] = useState<Persona | undefined>(initialPersona);

    useEffect(() => {
        if (persona?.id && persona.id !== settings.persona) {
            updateSettings((settings) => {
                settings.persona = persona.id;
            });
        }
    }, [persona?.id, settings.persona, updateSettings]);

    return (
        <CharacterContext.Provider
            value={{
                character,
                setCharacter,
                persona,
                setPersona
            }}
        >
            {children}
        </CharacterContext.Provider>
    );
}
