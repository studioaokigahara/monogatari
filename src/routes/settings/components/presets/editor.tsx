import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Preset } from "@/database/schema/preset";
import { useAppForm } from "@/hooks/use-app-form";
import { cn } from "@/lib/utils";
import { Bot, ListEnd, ListStart, Terminal, User } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
    { value: "system", icon: <Terminal />, label: "System" },
    { value: "user", icon: <User />, label: "User" },
    { value: "assistant", icon: <Bot />, label: "Assistant" }
];

const POSITION_OPTIONS = [
    { value: "before", icon: <ListStart />, label: "Before" },
    { value: "after", icon: <ListEnd />, label: "After" }
];

interface PromptEditorProps {
    selectedPreset: Preset;
    promptIndex: number;
}

export function PromptEditor({ selectedPreset, promptIndex }: PromptEditorProps) {
    const form = useAppForm({
        defaultValues: selectedPreset,
        validators: {
            onChange: ({ value }) => Preset.validate(value),
            onSubmit: ({ value }) => Preset.validate(value)
        },
        onSubmit: async ({ value }) => {
            try {
                await selectedPreset.update(value);
            } catch (error) {
                console.error("Failed to update preset:", error);
                toast.error("Failed to save preset", {
                    description: error instanceof Error ? error.message : ""
                });
            }
        },
        listeners: {
            onChangeDebounceMs: 1000,
            onChange: ({ formApi: form }) => {
                if (form.state.isValid && !form.state.isSubmitting) {
                    void form.handleSubmit();
                }
            }
        }
    });

    useEffect(() => form.reset(selectedPreset), [form, selectedPreset]);

    const getRoleColor = (role: string) => {
        switch (role) {
            case "system":
                return "text-blue-600 dark:text-blue-400";
            case "user":
                return "text-green-600 dark:text-green-400";
            case "assistant":
                return "text-purple-600 dark:text-purple-400";
            default:
                return "text-gray-600 dark:text-gray-400";
        }
    };

    return (
        <form
            className="@container flex grow flex-col gap-4 overflow-y-auto px-1 pt-6 pb-2"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FieldGroup>
                <form.AppField name="name">
                    {(field) => <field.InputField type="text" label="Preset Name" />}
                </form.AppField>
                <form.AppField name="description">
                    {(field) => <field.TextareaField label="Description" />}
                </form.AppField>
            </FieldGroup>
            <FieldGroup key={`prompts[${promptIndex}].id`}>
                <div className="flex justify-between @max-md:flex-wrap @max-md:gap-2">
                    <div className="my-auto space-x-2">
                        <form.Subscribe selector={(state) => state.values.prompts[promptIndex]}>
                            {(prompt) => (
                                <form.Field name={`prompts[${promptIndex}].enabled`}>
                                    {(field) => {
                                        const invalid =
                                            field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={invalid}>
                                                <FieldLabel
                                                    htmlFor={field.name}
                                                    className={cn(
                                                        "bg-[unset]! text-base",
                                                        getRoleColor(prompt.role)
                                                    )}
                                                >
                                                    <span className="mb-px max-w-[27ch] truncate font-semibold text-balance">
                                                        {prompt.name}
                                                    </span>
                                                    <Switch
                                                        id={field.name}
                                                        name={field.name}
                                                        checked={field.state.value}
                                                        onCheckedChange={(checked) =>
                                                            field.handleChange(checked)
                                                        }
                                                    />
                                                    <span className="rounded bg-muted px-2 py-1 text-xs capitalize">
                                                        {prompt.role} • {prompt.position}
                                                    </span>
                                                </FieldLabel>
                                                {invalid && (
                                                    <FieldError errors={field.state.meta.errors} />
                                                )}
                                            </Field>
                                        );
                                    }}
                                </form.Field>
                            )}
                        </form.Subscribe>
                    </div>
                </div>
                <form.AppField name={`prompts[${promptIndex}].name`}>
                    {(field) => <field.InputField type="text" label="Prompt Name" />}
                </form.AppField>
                <div className="grid grid-cols-3 gap-4">
                    <form.AppField name={`prompts[${promptIndex}].role`}>
                        {(field) => (
                            <field.SelectField
                                items={ROLE_OPTIONS}
                                label="Role"
                                placeholder="Select role..."
                            />
                        )}
                    </form.AppField>
                    <form.AppField name={`prompts[${promptIndex}].position`}>
                        {(field) => (
                            <field.SelectField
                                items={POSITION_OPTIONS}
                                label="Position"
                                placeholder="Select position..."
                            />
                        )}
                    </form.AppField>
                    <form.Subscribe
                        selector={(state) => state.values.prompts[promptIndex].position}
                    >
                        {(position) => (
                            <form.AppField name={`prompts[${promptIndex}].depth`}>
                                {(field) => (
                                    <field.InputField
                                        type="number"
                                        label="Depth"
                                        disabled={position === "before"}
                                    />
                                )}
                            </form.AppField>
                        )}
                    </form.Subscribe>
                </div>
                <form.AppField name={`prompts[${promptIndex}].content`}>
                    {(field) => <field.TextareaField label="Content" />}
                </form.AppField>
            </FieldGroup>
        </form>
    );
}
