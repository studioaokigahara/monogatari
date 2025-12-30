import { CharacterFormContext } from "@/hooks/use-character-form-context";
import { useState } from "react";

interface CharacterForm {
    mode: "create" | "edit";
    children: React.ReactNode;
}

export function CharacterFormProvider({ mode, children }: CharacterForm) {
    const [editing, setEditing] = useState(mode === "create");

    return (
        <CharacterFormContext value={{ mode, editing, setEditing }}>
            {children}
        </CharacterFormContext>
    );
}
