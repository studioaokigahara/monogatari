import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { useState } from "react";
import { toast } from "sonner";

interface DescriptionProps {
    character: CharacterRecord;
    editing: Boolean;
}

export default function Description({ character, editing }: DescriptionProps) {
    const [description, setDescription] = useState(character.data.description);

    const save = async (value: string) => {
        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                record.data.description = value;
            });
        toast.success(`Description saved.`);
    };

    if (editing) {
        return (
            <Card>
                <CardContent>
                    <Textarea
                        autoFocus
                        value={description}
                        onChange={(e) => setDescription(e.currentTarget.value)}
                        onBlur={() => save(description)}
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Prose>{description || "Click to add a description..."}</Prose>
            </CardContent>
        </Card>
    );
}
