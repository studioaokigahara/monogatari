import { createContext, useContext, useState } from "react";
import {
    FormApi,
    ReactFormApi,
    ReactFormExtendedApi,
    useForm
} from "@tanstack/react-form";
import { z } from "zod";
import { CharacterCardV3Data } from "@/database/schema/character";

const CharacterFormSchema = CharacterCardV3Data.extend({
    name: z.string().min(1, "Give them a name!"),
    description: z.string().min(1, "This is the most important part!"),
    first_mes: z.string().min(1, "You can't chat without a greeting."),
    creator: z.string().min(1, "Let people know who created this character!"),
    image: z
        .instanceof(Blob, { message: "What do they look like?" })
        .refine(
            (blob) =>
                ["image/png", "image/jpeg", "image.webp"].includes(blob.type),
            "Must be PNG, JPEG, or WebP"
        )
});

export type CharacterFormValues = z.infer<typeof CharacterFormSchema>;

interface CharacterFormContextProps {
    form: ReactFormExtendedApi<
        CharacterFormValues,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >;
    mode: "create" | "edit";
    editing: boolean;
    setEditing: (value: boolean) => void;
}

const CharacterFormContext = createContext<CharacterFormContextProps | null>(
    null
);

export function useCharacterForm() {
    const context = useContext(CharacterFormContext);
    if (!context)
        throw new Error(
            "useCharacterForm must be used inside <CharacterFormProvider/>"
        );
    return context;
}

interface CharacterFormProps {
    initialValues?: any;
    mode: "create" | "edit";
    children: React.ReactNode;
    onSubmit: (v: any) => Promise<void>;
}

export function CharacterFormProvider({
    initialValues,
    mode,
    children,
    onSubmit
}: CharacterFormProps) {
    const [editing, setEditing] = useState(mode === "create");

    const form = useForm({
        defaultValues: initialValues,
        validators: {
            onMount: CharacterFormSchema,
            onChange: CharacterFormSchema
        },
        onSubmit: ({ value }) => onSubmit(value)
    });

    return (
        <CharacterFormContext.Provider
            value={{
                form,
                mode,
                editing,
                setEditing
            }}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
            >
                {children}
            </form>
        </CharacterFormContext.Provider>
    );
}
