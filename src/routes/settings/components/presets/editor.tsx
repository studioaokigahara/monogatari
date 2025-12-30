import { Button } from "@/components/ui/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Preset, Prompt } from "@/database/schema/preset";
import useAutosave from "@/hooks/use-autosave";
import { cn, generateCuid2 } from "@/lib/utils";
import { useForm, useStore } from "@tanstack/react-form";
import {
    Bot,
    ListEnd,
    ListStart,
    Plus,
    Save,
    Terminal,
    Trash2,
    User,
    X
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

interface PromptEditorProps {
    selectedPreset: Preset;
    updateSelectedPreset: (id: string) => void;
    promptIndex: number;
}

export function PromptEditor({
    selectedPreset,
    updateSelectedPreset,
    promptIndex
}: PromptEditorProps) {
    const form = useForm({
        defaultValues: selectedPreset,
        validators: {
            onChange: ({ value }) => Preset.validate(value),
            onSubmit: ({ value }) => Preset.validate(value)
        },
        onSubmit: async ({ value }) => {
            await selectedPreset.update(value).catch((error: Error) => {
                console.error("Failed to update preset:", error);
                toast.error("Failed to save preset", {
                    description: error.message
                });
            });
        }
    });

    useEffect(() => form.reset(selectedPreset), [form, selectedPreset]);

    const [isDirty, isValid, isSubmitting, values] = useStore(
        form.store,
        (state) => [
            state.isDirty,
            state.isValid,
            state.isSubmitting,
            state.values
        ]
    );

    const handleSubmit = useCallback(() => form.handleSubmit(), [form]);

    useAutosave({
        isDirty,
        isValid,
        isSubmitting,
        values,
        handleSubmit
    });

    const addPrompt = () => {
        const newPrompt: Prompt = {
            id: generateCuid2(),
            name: "New Prompt",
            role: "system",
            content: "",
            enabled: true,
            position: "before",
            depth: 0
        };
        form.pushFieldValue("prompts", newPrompt);
    };

    const deletePrompt = async () => {
        await form.removeFieldValue("prompts", promptIndex);
    };

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
            className="flex flex-col grow pb-2 gap-4 overflow-y-auto"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FieldGroup>
                <FieldGroup>
                    <form.Field name="name">
                        {(field) => {
                            const invalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="gap-1">
                                    <FieldLabel htmlFor={field.name}>
                                        Name
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                    {invalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => {
                            const invalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="gap-1">
                                    <FieldLabel htmlFor={field.name}>
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                    {invalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
                <FieldGroup key={`prompts[${promptIndex}].id`}>
                    <form.Field name="prompts" mode="array">
                        {() => (
                            <>
                                <div className="flex justify-between">
                                    <form.Subscribe
                                        selector={(state) =>
                                            state.values.prompts[promptIndex]
                                        }
                                    >
                                        {(prompt) => (
                                            <div className="my-auto space-x-2">
                                                <form.Field
                                                    name={`prompts[${promptIndex}].enabled`}
                                                >
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta
                                                                .isTouched &&
                                                            !field.state.meta
                                                                .isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={
                                                                    invalid
                                                                }
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={
                                                                        field.name
                                                                    }
                                                                    className={cn(
                                                                        "text-base bg-[unset]!",
                                                                        getRoleColor(
                                                                            prompt.role
                                                                        )
                                                                    )}
                                                                >
                                                                    <span className="max-w-[27ch] text-balance font-semibold mb-px truncate">
                                                                        {
                                                                            prompt.name
                                                                        }
                                                                    </span>
                                                                    <Switch
                                                                        id={
                                                                            field.name
                                                                        }
                                                                        name={
                                                                            field.name
                                                                        }
                                                                        checked={
                                                                            field
                                                                                .state
                                                                                .value
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                    <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                                                                        {
                                                                            prompt.role
                                                                        }{" "}
                                                                        •{" "}
                                                                        {
                                                                            prompt.position
                                                                        }
                                                                    </span>
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field
                                                                                .state
                                                                                .meta
                                                                                .errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                            </div>
                                        )}
                                    </form.Subscribe>
                                    <div className="space-x-2 my-auto">
                                        <form.Subscribe
                                            selector={(state) => [
                                                state.isSubmitting,
                                                state.isValid
                                            ]}
                                        >
                                            {([isSubmitting, isValid]) => (
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        isSubmitting || !isValid
                                                    }
                                                >
                                                    <Save />
                                                    {isSubmitting
                                                        ? "Saving..."
                                                        : "Save"}
                                                </Button>
                                            )}
                                        </form.Subscribe>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                updateSelectedPreset("")
                                            }
                                        >
                                            <X />
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={addPrompt}
                                        >
                                            <Plus />
                                            New
                                        </Button>
                                        <form.Subscribe
                                            selector={(state) =>
                                                state.isSubmitting
                                            }
                                        >
                                            {(isSubmitting) => (
                                                <Button
                                                    variant="destructive"
                                                    disabled={isSubmitting}
                                                    onClick={deletePrompt}
                                                >
                                                    <Trash2 />
                                                    Delete
                                                </Button>
                                            )}
                                        </form.Subscribe>
                                    </div>
                                </div>
                                <form.Field
                                    name={`prompts[${promptIndex}].name`}
                                >
                                    {(field) => {
                                        const invalid =
                                            field.state.meta.isTouched &&
                                            !field.state.meta.isValid;
                                        return (
                                            <Field
                                                data-invalid={invalid}
                                                className="gap-1"
                                            >
                                                <FieldLabel
                                                    htmlFor={field.name}
                                                >
                                                    Name
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                {invalid && (
                                                    <FieldError
                                                        errors={
                                                            field.state.meta
                                                                .errors
                                                        }
                                                    />
                                                )}
                                            </Field>
                                        );
                                    }}
                                </form.Field>
                                <FieldGroup className="flex flex-row">
                                    <form.Field
                                        name={`prompts[${promptIndex}].role`}
                                    >
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field
                                                    data-invalid={invalid}
                                                    className="gap-1"
                                                >
                                                    <FieldLabel
                                                        htmlFor={field.name}
                                                    >
                                                        Role
                                                    </FieldLabel>
                                                    <Select
                                                        name={field.name}
                                                        value={
                                                            field.state.value
                                                        }
                                                        onValueChange={(v) =>
                                                            field.handleChange(
                                                                v as
                                                                    | "system"
                                                                    | "assistant"
                                                                    | "user"
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder="Select role..."
                                                                aria-invalid={
                                                                    invalid
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="system">
                                                                <Terminal />
                                                                System
                                                            </SelectItem>
                                                            <SelectItem value="user">
                                                                <User />
                                                                User
                                                            </SelectItem>
                                                            <SelectItem value="assistant">
                                                                <Bot />
                                                                Assistant
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {invalid && (
                                                        <FieldError
                                                            errors={
                                                                field.state.meta
                                                                    .errors
                                                            }
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    </form.Field>
                                    <form.Field
                                        name={`prompts[${promptIndex}].position`}
                                    >
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field
                                                    data-invalid={invalid}
                                                    className="gap-1"
                                                >
                                                    <FieldLabel
                                                        htmlFor={field.name}
                                                    >
                                                        Position
                                                    </FieldLabel>
                                                    <Select
                                                        name={field.name}
                                                        value={
                                                            field.state.value
                                                        }
                                                        onValueChange={(v) =>
                                                            field.handleChange(
                                                                v as
                                                                    | "before"
                                                                    | "after"
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder="Select position..."
                                                                aria-invalid={
                                                                    invalid
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="before">
                                                                <ListStart />
                                                                Before
                                                            </SelectItem>
                                                            <SelectItem value="after">
                                                                <ListEnd />
                                                                After
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {invalid && (
                                                        <FieldError
                                                            errors={
                                                                field.state.meta
                                                                    .errors
                                                            }
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    </form.Field>
                                    <form.Subscribe
                                        selector={(state) =>
                                            state.values.prompts[promptIndex]
                                                .position
                                        }
                                    >
                                        {(position) => (
                                            <form.Field
                                                name={`prompts[${promptIndex}].depth`}
                                            >
                                                {(field) => {
                                                    const invalid =
                                                        field.state.meta
                                                            .isTouched &&
                                                        !field.state.meta
                                                            .isValid;
                                                    return (
                                                        <Field
                                                            data-invalid={
                                                                invalid
                                                            }
                                                            className="gap-1"
                                                        >
                                                            <FieldLabel
                                                                htmlFor={
                                                                    field.name
                                                                }
                                                                aria-disabled={
                                                                    position ===
                                                                    "before"
                                                                }
                                                            >
                                                                Depth
                                                            </FieldLabel>
                                                            <Input
                                                                id={field.name}
                                                                name={
                                                                    field.name
                                                                }
                                                                type="number"
                                                                disabled={
                                                                    position ===
                                                                    "before"
                                                                }
                                                                value={
                                                                    field.state
                                                                        .value
                                                                }
                                                                onBlur={
                                                                    field.handleBlur
                                                                }
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                            {invalid && (
                                                                <FieldError
                                                                    errors={
                                                                        field
                                                                            .state
                                                                            .meta
                                                                            .errors
                                                                    }
                                                                />
                                                            )}
                                                        </Field>
                                                    );
                                                }}
                                            </form.Field>
                                        )}
                                    </form.Subscribe>
                                </FieldGroup>
                                <form.Field
                                    name={`prompts[${promptIndex}].content`}
                                >
                                    {(field) => {
                                        const invalid =
                                            field.state.meta.isTouched &&
                                            !field.state.meta.isValid;
                                        return (
                                            <Field
                                                data-invalid={invalid}
                                                className="gap-1"
                                            >
                                                <FieldLabel
                                                    htmlFor={field.name}
                                                >
                                                    Content
                                                </FieldLabel>
                                                <Textarea
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                {invalid && (
                                                    <FieldError
                                                        errors={
                                                            field.state.meta
                                                                .errors
                                                        }
                                                    />
                                                )}
                                            </Field>
                                        );
                                    }}
                                </form.Field>
                            </>
                        )}
                    </form.Field>
                </FieldGroup>
            </FieldGroup>
        </form>
    );
}
