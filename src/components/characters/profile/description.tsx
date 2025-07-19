import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CharacterRecord } from "@/database/schema/character";
import { useState } from "react";
import { toast } from "sonner";
import { CharacterManager } from "@/database/characters";

interface DescriptionProps {
    character: CharacterRecord | null;
    editing: boolean;
    isNewMode?: boolean;
    formData?: Partial<CharacterRecord["data"]>;
    onUpdate?: (data: Partial<CharacterRecord["data"]>) => void;
}

export default function Description({
    character,
    editing,
    isNewMode = false,
    formData,
    onUpdate
}: DescriptionProps) {
    const [description, setDescription] = useState(
        isNewMode
            ? formData?.description || ""
            : character?.data.description || ""
    );
    const [personality, setPersonality] = useState(
        isNewMode
            ? formData?.personality || ""
            : character?.data.personality || ""
    );
    const [scenario, setScenario] = useState(
        isNewMode ? formData?.scenario || "" : character?.data.scenario || ""
    );

    const saveDescription = async (value: string) => {
        if (!character) return;
        await CharacterManager.updateField(character.id, "description", value);
        toast.success(`Description saved.`);
    };

    const savePersonality = async (value: string) => {
        if (!character) return;
        await CharacterManager.updateField(character.id, "personality", value);
        toast.success(`Personality saved.`);
    };

    const saveScenario = async (value: string) => {
        if (!character) return;
        await CharacterManager.updateField(character.id, "scenario", value);
        toast.success(`Scenario saved.`);
    };

    if (editing) {
        return (
            <Card>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your character's appearance, background, and key details..."
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                if (isNewMode) {
                                    onUpdate?.({ description: e.target.value });
                                }
                            }}
                            onBlur={() =>
                                !isNewMode && saveDescription(description)
                            }
                            minRows={6}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="personality">Personality</Label>
                        <Textarea
                            id="personality"
                            placeholder="Describe their personality, speech patterns, mannerisms, and what makes them unique..."
                            value={personality}
                            onChange={(e) => {
                                setPersonality(e.target.value);
                                if (isNewMode) {
                                    onUpdate?.({ personality: e.target.value });
                                }
                            }}
                            onBlur={() =>
                                !isNewMode && savePersonality(personality)
                            }
                            minRows={4}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="scenario">Scenario</Label>
                        <Textarea
                            id="scenario"
                            placeholder="Describe the setting and circumstances where this character would be encountered..."
                            value={scenario}
                            onChange={(e) => {
                                setScenario(e.target.value);
                                if (isNewMode) {
                                    onUpdate?.({ scenario: e.target.value });
                                }
                            }}
                            onBlur={() => !isNewMode && saveScenario(scenario)}
                            minRows={4}
                            className="font-mono text-sm"
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

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
