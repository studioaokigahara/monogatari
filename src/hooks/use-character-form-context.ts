import { createContext, useContext } from "react";

interface CharacterFormContext {
    mode: "create" | "edit";
    editing: boolean;
    setEditing: (value: boolean) => void;
}

const CharacterFormContext = createContext<CharacterFormContext | undefined>(
    undefined
);

function useCharacterFormContext() {
    const context = useContext(CharacterFormContext);
    if (!context) {
        throw new Error(
            "useCharacterForm must be used inside a CharacterFormContext."
        );
    }
    return context;
}

export { CharacterFormContext, useCharacterFormContext };
