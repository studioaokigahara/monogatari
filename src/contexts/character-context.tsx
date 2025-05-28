import { db } from "@/database/database";
import type { CharacterRecord } from "@/database/schema/character";
import { PersonaRecord } from "@/database/schema/persona";
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { useImageContext } from "./image-context";
import { useSettingsContext } from "./settings-context";

interface CharacterContextType {
    character?: CharacterRecord;
    setCharacter: (rec?: CharacterRecord) => void;
    clearCharacter: () => void;
    persona?: PersonaRecord;
    setPersona: (rec?: PersonaRecord) => void;
    clearPersona: () => void;
    clearAll: () => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(
    undefined,
);

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettingsContext();
    const [character, setCharacter] = useState<CharacterRecord | undefined>(
        undefined,
    );
    const [persona, setPersona] = useState<PersonaRecord | undefined>(
        undefined,
    );

    const clearCharacter = () => setCharacter(undefined);
    const clearPersona = () => setPersona(undefined);
    const clearAll = () => {
        clearCharacter();
        clearPersona();
    };

    useEffect(() => {
        const fetch = async () => {
            const def = await db.personas.get(settings.persona);
            setPersona(def);
        };
        fetch();
    }, []);

    useEffect(() => {
        updateSettings({ persona: persona?.id });
    }, [persona?.id]);

    return (
        <CharacterContext.Provider
            value={{
                character,
                setCharacter,
                clearCharacter,
                persona,
                setPersona,
                clearPersona,
                clearAll,
            }}
        >
            {children}
        </CharacterContext.Provider>
    );
}

export function useCharacterContext(): CharacterContextType {
    const ctx = useContext(CharacterContext);
    if (!ctx)
        throw new Error(
            "useCharacterContext must be used inside CharacterProvider",
        );
    return ctx;
}
