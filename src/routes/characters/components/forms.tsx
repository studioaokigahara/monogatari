import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCharacterFormContext } from "@/contexts/character-form";
import { withForm } from "@/hooks/use-app-form";
import { cn } from "@/lib/utils";
import { characterFormOptions } from "@/types/character-form";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const HeaderFields = withForm({
    ...characterFormOptions,
    render: function ({ form }) {
        const { mode, setEditing } = useCharacterFormContext();
        const navigate = useNavigate();

        const handleCancel = () => {
            switch (mode) {
                case "create": {
                    void navigate({ to: "/characters" });
                    break;
                }
                case "edit": {
                    form.reset();
                    setEditing(false);
                    break;
                }
            }
        };

        return (
            <div className="z-1 flex w-full flex-col gap-4 rounded-xl">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <form.AppField name="name">
                        {(field) => <field.InputField type="text" label="Name" />}
                    </form.AppField>
                    <form.AppField name="nickname">
                        {(field) => <field.InputField type="text" label="Nickname" />}
                    </form.AppField>
                    <form.AppField name="creator">
                        {(field) => <field.InputField type="text" label="Creator" />}
                    </form.AppField>
                </div>
                {/* TODO: combobox tag selection, central DB store with
                editing/tag coloring/etc */}
                <div className="grid grid-cols-5 gap-4">
                    <form.AppField name="tags">
                        {(field) => (
                            <field.InputField type="array" label="Tags" className="col-span-3" />
                        )}
                    </form.AppField>
                    <form.AppField name="character_version">
                        {(field) => (
                            <field.InputField type="text" label="Version" className="col-span-2" />
                        )}
                    </form.AppField>
                </div>
                <div className="grid grid-cols-5 gap-4 *:not-last:col-span-2 *:not-last:max-h-[6lh]">
                    <form.AppField name="creator_notes">
                        {(field) => <field.TextareaField label="Creator Notes" />}
                    </form.AppField>
                    <form.AppField name="extensions.monogatari.tagline">
                        {(field) => <field.TextareaField label="Tagline" />}
                    </form.AppField>
                    <div className="col-span-1 flex place-items-end gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit}
                                    onClick={async () => {
                                        await form.handleSubmit();
                                        setEditing(false);
                                    }}
                                >
                                    {isSubmitting ? "Saving..." : "Save"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </div>
            </div>
        );
    }
});

export const DescriptionFields = withForm({
    ...characterFormOptions,
    render: function ({ form }) {
        return (
            <Card>
                <CardContent className="space-y-4">
                    <form.AppField name="description">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="Description"
                                placeholder="main"
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="personality">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="Personality"
                                placeholder="personality"
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="scenario">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="Scenario"
                                placeholder="scenario"
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="system_prompt">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="System Prompt"
                                placeholder="sys"
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="post_history_instructions">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="Post-History Instructions"
                                placeholder="post"
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                </CardContent>
            </Card>
        );
    }
});

export const GreetingsField = withForm({
    ...characterFormOptions,
    render: function ({ form }) {
        const [activeIndex, setActiveIndex] = useState(0);

        return (
            <Card className="overflow-hidden">
                <Tabs
                    value={String(activeIndex)}
                    onValueChange={(value) => setActiveIndex(Number(value))}
                >
                    <form.AppField name="alternate_greetings" mode="array">
                        {(field) => {
                            const greetings = [
                                form.getFieldValue("first_mes"),
                                ...field.state.value
                            ];

                            const addGreeting = () => {
                                field.pushValue("");
                                setActiveIndex(greetings.length);
                                toast.success("Added new greeting.");
                            };

                            const deleteGreeting = () => {
                                if (activeIndex === 0) {
                                    toast.error("You can't delete the first greeting, dummy.");
                                    return;
                                }

                                field.removeValue(activeIndex - 1);
                                setActiveIndex((prev) => prev - 1);
                                toast.success(`Deleted greeting ${activeIndex + 1}.`);
                            };

                            const tabTriggers = greetings.map((greeting, index) => (
                                <TabsTrigger
                                    key={`${index}-${greeting?.slice(0, 9)}`}
                                    value={String(index)}
                                >
                                    Greeting {index + 1}
                                </TabsTrigger>
                            ));

                            return (
                                <CardHeader>
                                    <TabsList
                                        variant="line"
                                        className={cn(
                                            greetings.length > 10
                                                ? "flex h-auto flex-wrap justify-start *:flex-0"
                                                : ""
                                        )}
                                    >
                                        {tabTriggers}
                                        <TabsTrigger value="greeting-new" onClick={addGreeting}>
                                            <Plus />
                                        </TabsTrigger>
                                        <TabsTrigger
                                            data-state="inactive"
                                            value={activeIndex}
                                            onClick={deleteGreeting}
                                        >
                                            <Trash2 />
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>
                            );
                        }}
                    </form.AppField>
                    <CardContent className="overflow-y-auto">
                        <form.AppField
                            name={
                                activeIndex === 0
                                    ? "first_mes"
                                    : `alternate_greetings[${activeIndex - 1}]`
                            }
                        >
                            {(field) => (
                                <field.MarkdownEditorField
                                    placeholder="Write a message..."
                                    // className="font-mono text-sm"
                                />
                            )}
                        </form.AppField>
                    </CardContent>
                </Tabs>
            </Card>
        );
    }
});

export const ExampleDialogueField = withForm({
    ...characterFormOptions,
    render: function ({ form }) {
        return (
            <Card>
                <CardContent>
                    <form.AppField name="mes_example">
                        {(field) => (
                            <field.MarkdownEditorField
                                label="Example Dialogue"
                                placeholder={`<START>\n{{char}}: Hello!\n{{user}}: Hi!`}
                                // className="font-mono text-sm"
                            />
                        )}
                    </form.AppField>
                </CardContent>
            </Card>
        );
    }
});
