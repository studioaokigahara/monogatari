import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";
import { useCharacterFormContext } from "@/hooks/use-character-form-context";
import { cn } from "@/lib/utils";
import { useField, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const HeaderFields = withCharacterForm({
    ...characterFormOptions,
    render: function Render({ form }) {
        const { mode, setEditing } = useCharacterFormContext();
        const navigate = useNavigate();

        const handleCancel = async () => {
            switch (mode) {
                case "create": {
                    await navigate({ to: "/characters" });
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
            <div className="flex flex-col w-full gap-4 rounded-xl z-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form.AppField name="name">
                        {(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Name
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="nickname">
                        {(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Nickname
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="creator">
                        {(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Creator
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="character_version">
                        {(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Version
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="number"
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    {/* TODO: combobox tag selection, central DB store with
                    editing/tag coloring/etc */}
                    <form.AppField name="tags">
                        {(field) => (
                            <div className="md:col-span-2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Tags
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    // @ts-expect-error withForm does not narrow types
                                    value={field.state.value.join(", ")}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.target.value.split(", ")
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                </div>
                <div className="flex gap-2">
                    <form.AppField name="creator_notes">
                        {(field) => (
                            <div className="w-1/2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Creator Notes
                                </label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="extensions.monogatari.tagline">
                        {(field) => (
                            <div className="w-1/2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Tagline
                                </label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <div className="flex gap-2 items-end">
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <form.Subscribe
                            selector={(state) => [
                                state.canSubmit,
                                state.isSubmitting
                            ]}
                        >
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

export const DescriptionFields = withCharacterForm({
    ...characterFormOptions,
    render: function Render({ form }) {
        return (
            <Card>
                <CardContent className="space-y-4">
                    <form.AppField name="description">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Description</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe your character's appearance, background, and key details..."
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    className="font-mono text-sm"
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="personality">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Personality</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe their personality, speech patterns, mannerisms, and what makes them unique..."
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="scenario">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Scenario</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe the setting and circumstances where this character would be encountered..."
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.Field name="system_prompt">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>
                                    System Prompt
                                </Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="post_history_instructions">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>
                                    Post-History Instructions
                                </Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    </form.Field>
                </CardContent>
            </Card>
        );
    }
});

export const GreetingsField = withCharacterForm({
    ...characterFormOptions,
    render: function Render({ form }) {
        const alternateGreetingsField = useField({
            form,
            name: "alternate_greetings",
            mode: "array"
        });

        const greetings = useStore(form.store, (state) => [
            state.values.first_mes,
            ...(state.values.alternate_greetings ?? [])
        ]);

        const [activeTab, setActiveTab] = useState("greeting-1");
        const activeIndex = useMemo(() => {
            const index = Number(activeTab.split("-")[1]) - 1;
            return Math.max(0, Math.min(greetings.length - 1, index));
        }, [activeTab, greetings.length]);

        const addGreeting = () => {
            alternateGreetingsField.pushValue("" as string as never);
            setActiveTab(`greeting-${greetings.length + 1}`);
            toast.success("Added new greeting.");
        };

        const deleteGreeting = () => {
            if (activeIndex === 0) {
                toast.error("You can't delete the first greeting, dummy.");
                return;
            }

            alternateGreetingsField.removeValue(activeIndex - 1);
            setActiveTab(`greeting-${activeIndex}`);
            toast.success(`Deleted greeting ${activeIndex + 1}.`);
        };

        return (
            <Card className="overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <CardHeader>
                        <TabsList
                            className={cn(
                                greetings.length > 10
                                    ? "h-auto flex flex-wrap justify-start *:flex-0"
                                    : ""
                            )}
                        >
                            {greetings.map((greeting, idx) => (
                                <TabsTrigger
                                    key={greeting.slice(0, 9)}
                                    value={`greeting-${idx + 1}`}
                                >
                                    Greeting {idx + 1}
                                </TabsTrigger>
                            ))}
                            <>
                                <TabsTrigger
                                    value="greeting-new"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        addGreeting();
                                    }}
                                >
                                    <Plus />
                                </TabsTrigger>
                                <TabsTrigger
                                    data-state="inactive"
                                    value={activeTab}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        deleteGreeting();
                                    }}
                                >
                                    <Trash2 />
                                </TabsTrigger>
                            </>
                        </TabsList>
                    </CardHeader>
                    <CardContent className="overflow-y-auto">
                        <form.AppField
                            name={
                                activeIndex === 0
                                    ? "first_mes"
                                    : `alternate_greetings[${activeIndex - 1}]`
                            }
                        >
                            {(field) => (
                                <Textarea
                                    key={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.currentTarget.value
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                    placeholder="Write a message..."
                                    className="font-mono text-sm"
                                    autoFocus
                                />
                            )}
                        </form.AppField>
                    </CardContent>
                </Tabs>
            </Card>
        );
    }
});

export const ExampleDialogueField = withCharacterForm({
    ...characterFormOptions,
    render: ({ form }) => {
        return (
            <Card>
                <CardContent>
                    <form.AppField name="mes_example">
                        {(field) => (
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value as string}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                placeholder={`<START>\n{{char}}: Hello!\n{{user}}: Hi!`}
                                className="font-mono text-sm"
                                autoFocus
                            />
                        )}
                    </form.AppField>
                </CardContent>
            </Card>
        );
    }
});
