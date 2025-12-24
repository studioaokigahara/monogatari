import { createContext, useContext, useState } from "react";

interface CharacterFormContextProps {
    mode: "create" | "edit";
    editing: boolean;
    setEditing: (value: boolean) => void;
}

const CharacterFormContext = createContext<CharacterFormContextProps | null>(
    null
);

export function useCharacterFormContext() {
    const context = useContext(CharacterFormContext);
    if (!context) {
        throw new Error(
            "useCharacterForm must be used inside <CharacterFormProvider/>"
        );
    }
    return context;
}

interface CharacterFormProps {
    mode: "create" | "edit";
    children: React.ReactNode;
}

export function CharacterFormProvider({ mode, children }: CharacterFormProps) {
    const [editing, setEditing] = useState(mode === "create");

    return (
        <CharacterFormContext.Provider
            value={{
                mode,
                editing,
                setEditing
            }}
        >
            {children}
        </CharacterFormContext.Provider>
    );
}
