import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { FieldGroup } from "@/components/ui/field";
import { Lorebook } from "@/database/schema/lorebook";
import { useAppForm } from "@/hooks/use-app-form";
import { useLoaderData } from "@tanstack/react-router";
import { ListEnd, ListStart, TextSelect } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const POSITION_OPTIONS = [
    { value: "before_char", icon: <ListStart />, label: "Before Character" },
    { value: "after_after", icon: <ListEnd />, label: "After Character" }
];

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

interface LorebookEditorProps {
    lorebook: Lorebook;
    entryIndex: number;
}

export function LorebookEditor({ lorebook, entryIndex: index }: LorebookEditorProps) {
    const form = useAppForm({
        defaultValues: lorebook,
        validators: {
            onChange: ({ value }) => Lorebook.validate(value),
            onSubmit: ({ value }) => Lorebook.validate(value)
        },
        onSubmit: async ({ value }) => {
            try {
                await lorebook.update(value);
            } catch (error) {
                console.error("Failed to update lorebook:", error);
                toast.error("Failed to update lorebook", {
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

    useEffect(() => form.reset(lorebook), [form, lorebook]);

    const { characters } = useLoaderData({ from: "/settings/lorebooks" });

    const items = characters.map((character) => ({
        value: character.id,
        label: character.data.name
    }));

    const FormHeader = () => (
        <FieldGroup>
            <div className="flex flex-row items-center gap-4 @max-md:flex-wrap">
                <form.AppField name="data.name">
                    {(field) => <field.InputField type="text" label="Lorebook Name" />}
                </form.AppField>
                <div className="flex flex-row gap-2">
                    <form.AppField name="enabled">
                        {(field) => (
                            <field.SwitchField
                                type="number"
                                label="Enabled"
                                className="w-fit @md:mt-7"
                                labelClassName="bg-[unset]!"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="global">
                        {(field) => (
                            <field.SwitchField
                                type="number"
                                label="Global"
                                className="w-fit @md:mt-7"
                                labelClassName="bg-[unset]!"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="data.recursive_scanning">
                        {(field) => (
                            <field.SwitchField
                                type="number"
                                label="Recursive"
                                className="w-fit @md:mt-7"
                                labelClassName="bg-[unset]!"
                            />
                        )}
                    </form.AppField>
                </div>
            </div>
            <form.AppField name="data.description">
                {(field) => <field.TextareaField label="Description" placeholder="readme.md" />}
            </form.AppField>
            <div className="grid grid-cols-5 items-end gap-4">
                <form.AppField name="data.scan_depth">
                    {(field) => (
                        <field.InputField type="number" label="Scan Depth" className="col-span-1" />
                    )}
                </form.AppField>
                <form.AppField name="data.token_budget">
                    {(field) => (
                        <field.InputField
                            type="number"
                            label="Token Budget"
                            className="col-span-1"
                        />
                    )}
                </form.AppField>
                <form.AppField name="linkedCharacterIDs">
                    {(field) => (
                        <field.ComboboxField
                            items={items}
                            label="Linked Characters"
                            placeholder="Select characters..."
                            className="col-span-3"
                        />
                    )}
                </form.AppField>
            </div>
        </FieldGroup>
    );

    if (!lorebook.data.entries) {
        return (
            <form
                className="@container flex grow flex-col gap-4 overflow-y-auto px-1 pt-6 pb-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                }}
            >
                <FieldGroup>
                    <FormHeader />
                    <NoLorebookEntries />
                </FieldGroup>
            </form>
        );
    }

    return (
        <form
            className="@container flex grow flex-col gap-4 overflow-x-hidden px-1 pt-6 pb-2"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FormHeader />
            <FieldGroup key={`data.entries[${index}].id`}>
                <div className="flex flex-row items-center gap-4 @max-md:flex-wrap">
                    <form.Subscribe selector={(state) => state.values.data.entries[index]}>
                        {(entry) => (
                            <form.AppField name={`data.entries[${index}].enabled`}>
                                {(field) => (
                                    <field.SwitchField
                                        type="boolean"
                                        label={entry.name}
                                        className="w-auto grow"
                                        labelClassName="bg-[unset]! text-base font-semibold"
                                    />
                                )}
                            </form.AppField>
                        )}
                    </form.Subscribe>
                    <div className="flex flex-row flex-wrap gap-2">
                        <form.AppField name={`data.entries[${index}].case_sensitive`}>
                            {(field) => (
                                <field.SwitchField
                                    type="boolean"
                                    label="Case Sensitive"
                                    className="w-fit"
                                    labelClassName="bg-[unset]!"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name={`data.entries[${index}].use_regex`}>
                            {(field) => (
                                <field.SwitchField
                                    type="boolean"
                                    label="Use Regex"
                                    className="w-fit"
                                    labelClassName="bg-[unset]!"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name={`data.entries[${index}].constant`}>
                            {(field) => (
                                <field.SwitchField
                                    type="boolean"
                                    label="Constant"
                                    className="w-fit"
                                    labelClassName="bg-[unset]!"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name={`data.entries[${index}].selective`}>
                            {(field) => (
                                <field.SwitchField
                                    type="boolean"
                                    label="Selective"
                                    className="w-fit"
                                    labelClassName="bg-[unset]!"
                                />
                            )}
                        </form.AppField>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <form.AppField name={`data.entries[${index}].name`}>
                        {(field) => <field.InputField type="text" label="Entry Name" />}
                    </form.AppField>
                    <form.AppField name={`data.entries[${index}].comment`}>
                        {(field) => <field.InputField type="text" label="Comment" />}
                    </form.AppField>
                    <form.AppField name={`data.entries[${index}].keys`}>
                        {(field) => <field.InputField type="array" label="Keys" />}
                    </form.AppField>
                    <form.Subscribe
                        selector={(state) => state.values.data.entries[index].selective}
                    >
                        {(selective) => (
                            <form.AppField name={`data.entries[${index}].secondary_keys`}>
                                {(field) => (
                                    <field.InputField
                                        type="array"
                                        label="Secondary Keys"
                                        disabled={!selective}
                                    />
                                )}
                            </form.AppField>
                        )}
                    </form.Subscribe>
                    <form.AppField name={`data.entries[${index}].position`}>
                        {(field) => (
                            <field.SelectField
                                items={POSITION_OPTIONS}
                                label="Position"
                                placeholder="Select position..."
                            />
                        )}
                    </form.AppField>
                    <form.AppField name={`data.entries[${index}].priority`}>
                        {(field) => <field.InputField type="number" label="Priority" />}
                    </form.AppField>
                </div>
                <form.AppField name={`data.entries[${index}].content`}>
                    {(field) => <field.TextareaField label="Content" />}
                </form.AppField>
            </FieldGroup>
        </form>
    );
}
