import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Character } from "@/database/schema/character";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";

export function Description({ character }: { character: Character }) {
    return (
        <Card>
            <CardContent className="space-y-4">
                <div>
                    {character.data.scenario && (
                        <h4 className="font-medium mb-2">Description</h4>
                    )}
                    <Prose>
                        {character.data.description ??
                            "No description provided."}
                    </Prose>
                </div>
                {character.data.personality && (
                    <div>
                        <h4 className="font-medium mb-2">Personality</h4>
                        <Prose className="max-w-[unset]">
                            {character.data.personality}
                        </Prose>
                    </div>
                )}
                {character.data.scenario && (
                    <div>
                        <h4 className="font-medium mb-2">Scenario</h4>
                        <Prose className="max-w-[unset]">
                            {character.data.scenario}
                        </Prose>
                    </div>
                )}
                {!character.data.description &&
                    !character.data.personality &&
                    !character.data.scenario && (
                        <Prose>Click edit to add character details...</Prose>
                    )}
            </CardContent>
        </Card>
    );
}

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
