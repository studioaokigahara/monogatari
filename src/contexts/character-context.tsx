import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { CharacterContext } from "@/hooks/use-character-context";
import { useSettingsContext } from "@/hooks/use-settings-context";
import { ReactNode, useEffect, useState } from "react";

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettingsContext();
    const [character, setCharacter] = useState<Character>();
    const [persona, setPersona] = useState<Persona>();

    useEffect(() => {
        void db.personas.get(settings.persona).then(setPersona);
    }, [settings.persona]);

    useEffect(() => {
        updateSettings({ persona: persona?.id });
    }, [updateSettings, persona?.id]);

    return (
        <CharacterContext
            value={{
                character,
                setCharacter,
                persona,
                setPersona
            }}
        >
            {children}
        </CharacterContext>
    );
}
