import {
    CharacterCardV3Asset,
    CharacterCardV3Data
} from "@/database/schema/character";
import {
    createFormHook,
    createFormHookContexts,
    formOptions
} from "@tanstack/react-form";
import z from "zod";

const CharacterFormSchema = CharacterCardV3Data.extend({
    name: z.string().min(1, "Give them a name!").default(""),
    description: z
        .string()
        .min(1, "This is the most important part!")
        .default(""),
    personality: z.string().default(""),
    scenario: z.string().default(""),
    mes_example: z.string().default(""),
    first_mes: z
        .string()
        .min(1, "You can't chat without a greeting.")
        .default(""),
    creator: z
        .string()
        .min(1, "Let people know who created this character!")
        .default(""),
    creator_notes: z.string().default(""),
    system_prompt: z.string().default(""),
    post_history_instructions: z.string().default(""),
    alternate_greetings: z.array(z.string()).default([""]),
    character_version: z.string().default(""),
    source: z.array(z.string()).default([""]),
    tags: z.array(z.string()).default([""]),
    group_only_greetings: z.array(z.string()).default([""]),
    extensions: z.record(z.string(), z.any()).default({
        monogatari: {
            tagline: ""
        }
    }),
    assets: z.array(CharacterCardV3Asset).default([
        {
            type: "icon",
            uri: "ccdefault:",
            name: "main",
            ext: "png"
        }
    ])
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

export const characterFormOptions = formOptions({
    defaultValues: CharacterFormSchema.parse({}),
    validators: {
        onMount: CharacterFormSchema,
        onChange: CharacterFormSchema
    }
});
