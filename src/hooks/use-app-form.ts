import {
    ComboboxField,
    InputField,
    MarkdownEditorField,
    SelectField,
    SwitchField,
    TextareaField
} from "@/components/fields";
import { fieldContext, formContext } from "@/contexts/form";
import { createFormHook } from "@tanstack/react-form";

export const { useAppForm, withForm } = createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
        InputField,
        TextareaField,
        SwitchField,
        ComboboxField,
        SelectField,
        MarkdownEditorField
    },
    formComponents: {}
});
