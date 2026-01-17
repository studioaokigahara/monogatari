import { CharacterContext } from "@/contexts/character";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { useSettings } from "@/hooks/use-settings";
import { ReactNode, useEffect, useState } from "react";

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettings();
    const [character, setCharacter] = useState<Character>();
    const [persona, setPersona] = useState<Persona>();

    useEffect(() => {
        void db.personas.get(settings.persona).then(setPersona);
    }, [settings.persona]);

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
