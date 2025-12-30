import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Character } from "@/database/schema/character";

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
