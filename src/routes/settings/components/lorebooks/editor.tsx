import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
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
import { db } from "@/database/monogatari-db";
import { Lorebook } from "@/database/schema/lorebook";
import { generateCuid2 } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useLiveQuery } from "dexie-react-hooks";
import { ListEnd, ListPlus, ListStart, TextSelect, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

function NoLorebookEntries() {
    return (
        <Empty className="my-6 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <TextSelect />
                </EmptyMedia>
                <EmptyTitle>No Lorebook Entries</EmptyTitle>
                <EmptyDescription>Click "Add Entry" to get started</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

interface Props {
    lorebook: Lorebook;
    entryIndex: number;
}

export function LorebookEditor({ lorebook, entryIndex: index }: Props) {
    const form = useForm({
        defaultValues: lorebook,
        validators: {
            onChange: ({ value }) => Lorebook.validate(value),
            onSubmit: ({ value }) => Lorebook.validate(value)
        },
        onSubmit: async ({ value }) => {
            try {
                await lorebook.update(value.data);
            } catch (error) {
                console.error("Failed to update lorebook:", error);
                toast.error("Failed to update lorebook", {
                    description: error instanceof Error ? error.message : ""
                });
            }
        },
        listeners: {
            onChangeDebounceMs: 500,
            onChange: ({ formApi: form }) => {
                if (form.state.isValid && !form.state.isSubmitting) {
                    void form.handleSubmit();
                }
            }
        }
    });

    useEffect(() => form.reset(lorebook), [form, lorebook]);

    const addEntry = () => {
        const newEntry: Lorebook["data"]["entries"][number] = {
            id: generateCuid2(),
            name: "",
            comment: "",
            keys: [""],
            secondary_keys: undefined,
            position: "before_char",
            priority: 0,
            content: "",
            enabled: true,
            case_sensitive: false,
            use_regex: false,
            constant: false,
            selective: false,
            extensions: {},
            insertion_order: 0
        };
        form.pushFieldValue("data.entries", newEntry);
    };

    const deleteEntry = async () => {
        await form.removeFieldValue("data.entries", index);
    };

    const characters = useLiveQuery(() => db.characters.orderBy("data.name").toArray(), []);

    const options = characters
        ? characters.map((character) => ({
              value: character.id,
              label: character.data.name
          }))
        : [
              {
                  value: "placeholder",
                  label: "placeholder"
              }
          ];

    const CommonForm = () => (
        <>
            <FieldGroup className="*:gap-1">
                <FieldGroup className="flex flex-row *:gap-1 @max-md:flex-wrap">
                    <form.Field name="data.name">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={invalid}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="enabled">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="mt-6 w-min self-center">
                                    <FieldLabel htmlFor={field.name} className="bg-[unset]!">
                                        Enabled
                                        <Switch
                                            id={field.name}
                                            name={field.name}
                                            checked={Boolean(field.state.value)}
                                            onCheckedChange={(checked) =>
                                                field.handleChange(checked ? 1 : 0)
                                            }
                                        />
                                    </FieldLabel>
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="global">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="mt-6 w-min self-center">
                                    <FieldLabel htmlFor={field.name} className="bg-[unset]!">
                                        Global
                                        <Switch
                                            id={field.name}
                                            name={field.name}
                                            checked={Boolean(field.state.value)}
                                            onCheckedChange={(checked) =>
                                                field.handleChange(checked ? 1 : 0)
                                            }
                                        />
                                    </FieldLabel>
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="data.recursive_scanning">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="mt-6 w-min self-center">
                                    <FieldLabel htmlFor={field.name} className="bg-[unset]!">
                                        Recursive
                                        <Switch
                                            id={field.name}
                                            name={field.name}
                                            checked={field.state.value}
                                            onCheckedChange={(checked) =>
                                                field.handleChange(checked)
                                            }
                                        />
                                    </FieldLabel>
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
                <form.Field name="data.description">
                    {(field) => {
                        const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                            <Field data-invalid={invalid}>
                                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    aria-invalid={invalid}
                                    placeholder="README.md"
                                />
                                {invalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        );
                    }}
                </form.Field>
                <FieldGroup className="flex w-full flex-row *:gap-1">
                    <form.Field name="data.scan_depth">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="w-fit">
                                    <FieldLabel htmlFor={field.name}>Scan Depth</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                        aria-invalid={invalid}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="data.token_budget">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid} className="w-fit">
                                    <FieldLabel htmlFor={field.name}>Token Budget</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                        aria-invalid={invalid}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="linkedCharacterIDs">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name} className="bg-[unset]!">
                                        Linked Characters
                                    </FieldLabel>
                                    <Combobox
                                        variant="multiple"
                                        options={options}
                                        id={field.name}
                                        name={field.name}
                                        placeholder="Select Characters..."
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={field.handleChange}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
            </FieldGroup>
        </>
    );

    if (!lorebook.data.entries) {
        return (
            <form
                className="flex grow flex-col gap-4 overflow-auto pt-6 pb-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                }}
            >
                <FieldGroup>
                    <CommonForm />
                    <NoLorebookEntries />
                </FieldGroup>
            </form>
        );
    }

    return (
        <form
            className="@container flex grow flex-col gap-4 overflow-auto px-1 pt-6 pb-2"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FieldSet>
                <CommonForm />
                <FieldGroup key={`data.entries[${index}].id`}>
                    <form.Field name="data.entries" mode="array">
                        {() => (
                            <>
                                <form.Subscribe
                                    selector={(state) => state.values.data.entries[index]}
                                >
                                    {(entry) => (
                                        <div className="flex flex-col justify-between gap-2 @max-md:flex-wrap">
                                            <div className="flex grow flex-row items-center gap-1 @max-md:flex-wrap">
                                                <form.Field name={`data.entries[${index}].enabled`}>
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta.isTouched &&
                                                            !field.state.meta.isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={invalid}
                                                                className="w-auto grow"
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={field.name}
                                                                    className="bg-[unset]! text-base font-semibold"
                                                                >
                                                                    {entry.name}
                                                                    <Switch
                                                                        id={field.name}
                                                                        name={field.name}
                                                                        checked={field.state.value}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field.state.meta.errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                                <div className="flex flex-nowrap content-center gap-2">
                                                    <Button onClick={addEntry}>
                                                        <ListPlus />
                                                        Add Entry
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={deleteEntry}
                                                    >
                                                        <Trash2 />
                                                        Delete Entry
                                                    </Button>
                                                </div>
                                            </div>
                                            <FieldGroup className="flex flex-row flex-wrap">
                                                <form.Field
                                                    name={`data.entries[${index}].case_sensitive`}
                                                >
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta.isTouched &&
                                                            !field.state.meta.isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={invalid}
                                                                className="w-fit"
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={field.name}
                                                                    className="bg-[unset]!"
                                                                >
                                                                    Case Sensitive
                                                                    <Switch
                                                                        id={field.name}
                                                                        name={field.name}
                                                                        checked={field.state.value}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field.state.meta.errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                                <form.Field
                                                    name={`data.entries[${index}].use_regex`}
                                                >
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta.isTouched &&
                                                            !field.state.meta.isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={invalid}
                                                                className="w-fit"
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={field.name}
                                                                    className="bg-[unset]!"
                                                                >
                                                                    Use Regex
                                                                    <Switch
                                                                        id={field.name}
                                                                        name={field.name}
                                                                        checked={field.state.value}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field.state.meta.errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                                <form.Field
                                                    name={`data.entries[${index}].constant`}
                                                >
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta.isTouched &&
                                                            !field.state.meta.isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={invalid}
                                                                className="w-min"
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={field.name}
                                                                    className="w-min bg-[unset]!"
                                                                >
                                                                    Constant
                                                                    <Switch
                                                                        id={field.name}
                                                                        name={field.name}
                                                                        checked={field.state.value}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field.state.meta.errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                                <form.Field
                                                    name={`data.entries[${index}].selective`}
                                                >
                                                    {(field) => {
                                                        const invalid =
                                                            field.state.meta.isTouched &&
                                                            !field.state.meta.isValid;
                                                        return (
                                                            <Field
                                                                data-invalid={invalid}
                                                                className="w-min"
                                                            >
                                                                <FieldLabel
                                                                    htmlFor={field.name}
                                                                    className="bg-[unset]!"
                                                                >
                                                                    Selective
                                                                    <Switch
                                                                        id={field.name}
                                                                        name={field.name}
                                                                        checked={field.state.value}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            field.handleChange(
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </FieldLabel>
                                                                {invalid && (
                                                                    <FieldError
                                                                        errors={
                                                                            field.state.meta.errors
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        );
                                                    }}
                                                </form.Field>
                                            </FieldGroup>
                                        </div>
                                    )}
                                </form.Subscribe>
                                <FieldGroup className="flex flex-row *:gap-1">
                                    <form.Field name={`data.entries[${index}].name`}>
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={invalid}>
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
                                                        aria-invalid={invalid}
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
                                    <form.Field name={`data.entries[${index}].comment`}>
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={invalid}>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Comment
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        aria-invalid={invalid}
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
                                <FieldGroup className="flex flex-row *:gap-1">
                                    <form.Field name={`data.entries[${index}].keys`}>
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={invalid}>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Keys
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        value={field.state.value.join(", ")}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(
                                                                e.target.value.split(", ")
                                                            )
                                                        }
                                                        aria-invalid={invalid}
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
                                    <form.Subscribe
                                        selector={(state) =>
                                            state.values.data.entries[index].selective
                                        }
                                    >
                                        {(selective) => (
                                            <form.Field
                                                name={`data.entries[${index}].secondary_keys`}
                                            >
                                                {(field) => {
                                                    const invalid =
                                                        field.state.meta.isTouched &&
                                                        !field.state.meta.isValid;
                                                    return (
                                                        <Field data-invalid={invalid}>
                                                            <FieldLabel htmlFor={field.name}>
                                                                Secondary Keys
                                                            </FieldLabel>
                                                            <Input
                                                                id={field.name}
                                                                name={field.name}
                                                                value={
                                                                    field.state.value
                                                                        ? field.state.value.join(
                                                                              ", "
                                                                          )
                                                                        : ""
                                                                }
                                                                disabled={!selective}
                                                                onBlur={field.handleBlur}
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        e.target.value.split(", ")
                                                                    )
                                                                }
                                                                aria-invalid={invalid}
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
                                        )}
                                    </form.Subscribe>
                                </FieldGroup>
                                <FieldGroup className="flex flex-row *:gap-1">
                                    <form.Field name={`data.entries[${index}].position`}>
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={invalid}>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Position
                                                    </FieldLabel>
                                                    <Select
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onValueChange={(v) =>
                                                            field.handleChange(
                                                                v as "before_char" | "after_char"
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder="Select position..."
                                                                aria-invalid={invalid}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="before_char">
                                                                <ListStart />
                                                                Before Character
                                                            </SelectItem>
                                                            <SelectItem value="after_char">
                                                                <ListEnd />
                                                                After Character
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {invalid && (
                                                        <FieldError
                                                            errors={field.state.meta.errors}
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    </form.Field>
                                    <form.Field name={`data.entries[${index}].priority`}>
                                        {(field) => {
                                            const invalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={invalid}>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Priority
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        type="number"
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(
                                                                Number(e.target.value)
                                                            )
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
                                <form.Field name={`data.entries[${index}].content`}>
                                    {(field) => {
                                        const invalid =
                                            field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={invalid} className="gap-1">
                                                <FieldLabel htmlFor={field.name}>
                                                    Content
                                                </FieldLabel>
                                                <Textarea
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    aria-invalid={invalid}
                                                />
                                                {invalid && (
                                                    <FieldError errors={field.state.meta.errors} />
                                                )}
                                            </Field>
                                        );
                                    }}
                                </form.Field>
                            </>
                        )}
                    </form.Field>
                </FieldGroup>
            </FieldSet>
        </form>
    );
}
