import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CharacterRecord } from "@/database/schema/character";
import { useCharacterForm } from "@/contexts/character-form-context";

interface DescriptionProps {
    character?: CharacterRecord | null;
}

export default function Description({ character }: DescriptionProps) {
    const { form, editing } = useCharacterForm();

    if (editing)
        return (
            <Card>
                <CardContent className="space-y-4">
                    <form.Field
                        name="description"
                        children={(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Description</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe your character's appearance, background, and key details..."
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    minRows={6}
                                    className="font-mono text-sm"
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    />

                    <form.Field
                        name="personality"
                        children={(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Personality</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe their personality, speech patterns, mannerisms, and what makes them unique..."
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    minRows={4}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    />

                    <form.Field
                        name="scenario"
                        children={(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Scenario</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Describe the setting and circumstances where this character would be encountered..."
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    minRows={4}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    />
                </CardContent>
            </Card>
        );

    return (
        <Card>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <Prose>
                        {character?.data.description ||
                            "No description provided."}
                    </Prose>
                </div>

                {character?.data.personality && (
                    <div>
                        <h4 className="font-medium mb-2">Personality</h4>
                        <Prose>{character.data.personality}</Prose>
                    </div>
                )}

                {character?.data.scenario && (
                    <div>
                        <h4 className="font-medium mb-2">Scenario</h4>
                        <Prose>{character.data.scenario}</Prose>
                    </div>
                )}

                {!character?.data.description &&
                    !character?.data.personality &&
                    !character?.data.scenario && (
                        <Prose>Click edit to add character details...</Prose>
                    )}
            </CardContent>
        </Card>
    );
}
