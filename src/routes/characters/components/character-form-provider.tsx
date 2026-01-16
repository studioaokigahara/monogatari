import { CharacterFormContext } from "@/contexts/character-form";
import { useState } from "react";

interface CharacterForm {
    mode: "create" | "edit";
    children: React.ReactNode;
}

export function CharacterFormProvider({ mode, children }: CharacterForm) {
    const [editing, setEditing] = useState(mode === "create");

    return (
        <CharacterFormContext.Provider value={{ mode, editing, setEditing }}>
            {children}
        </CharacterFormContext.Provider>
    );
}
