import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { createContext, useContext } from "react";

interface CharacterContext {
    character?: Character;
    setCharacter: (character: Character) => void;
    persona?: Persona;
    setPersona: (persona: Persona) => void;
}

const CharacterContext = createContext<CharacterContext | undefined>(undefined);

function useCharacterContext(): CharacterContext {
    const context = useContext(CharacterContext);
    if (!context) {
        throw new Error("useCharacterContext must be used within a CharacterContext.Provider.");
    }
    return context;
}

export { CharacterContext, useCharacterContext };
