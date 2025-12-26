import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import { useSettingsContext } from "./settings-context";

interface CharacterContextType {
    character?: Character;
    setCharacter: (character: Character) => void;
    persona?: Persona;
    setPersona: (persona: Persona) => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(
    undefined
);

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettingsContext();
    const [character, setCharacter] = useState<Character>();
    const [persona, setPersona] = useState<Persona>();

    useEffect(() => {
        db.personas.get(settings.persona).then(setPersona);
    }, [settings.persona]);

    useEffect(() => {
        updateSettings({ persona: persona?.id });
    }, [updateSettings, persona?.id]);

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

export function useCharacterContext(): CharacterContextType {
    const context = useContext(CharacterContext);
    if (!context) {
        throw new Error(
            "useCharacterContext must be used within CharacterProvider."
        );
    }
    return context;
}
