import { CharacterCardV3Data } from "@/database/schema/character";
import { createFormHook, createFormHookContexts, formOptions } from "@tanstack/react-form";
import z from "zod";

const CharacterFormSchema = z.object({
    ...CharacterCardV3Data.shape,
    name: z.string().min(1, "Give them a name!"),
    description: z.string().min(1, "This is the most important part!"),
    first_mes: z.string().min(1, "You can't chat without a greeting."),
    creator: z.string().min(1, "Let people know who created this character!")
});
export type CharacterFormSchema = z.infer<typeof CharacterFormSchema>;

export const { fieldContext, useFieldContext, formContext, useFormContext } =
    createFormHookContexts();

export const {
    useAppForm: useCharacterForm,
    withForm: withCharacterForm,
    withFieldGroup: withCharacterFieldGroup
} = createFormHook({
    fieldComponents: {},
    formComponents: {},
    fieldContext,
    formContext
});

const defaultValues: CharacterFormSchema = {
    name: "",
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    creator_notes: "",
    system_prompt: "",
    post_history_instructions: "",
    alternate_greetings: [],
    tags: [],
    creator: "",
    character_version: "",
    extensions: {
        monogatari: {
            tagline: ""
        }
    },
    assets: [],
    source: [],
    group_only_greetings: []
};

export const characterFormOptions = formOptions({
    defaultValues,
    validators: {
        // @ts-expect-error some lorebook keys have defaults
        // zod does not distinguish between foo?: string and foo: string | undefined
        onMount: CharacterFormSchema,
        // @ts-expect-error
        onChange: CharacterFormSchema
    }
});
