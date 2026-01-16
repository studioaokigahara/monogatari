import { CharacterContext } from "@/contexts/character";
import { useSettingsContext } from "@/contexts/settings";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { ReactNode, useEffect, useState } from "react";

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettingsContext();
    const [character, setCharacter] = useState<Character>();
    const [persona, setPersona] = useState<Persona>();

    useEffect(() => {
        void db.personas.get(settings.persona).then(setPersona);
    }, [settings.persona]);

    useEffect(() => {
        if (persona?.id !== settings.persona) {
            updateSettings({ persona: persona?.id });
        }
    }, [updateSettings, persona?.id, settings.persona]);

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
