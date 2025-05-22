import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { useState } from "react";
import { toast } from "sonner";

function extractExamples(raw: string): string[] {
    return Array.from(raw.matchAll(/<START>\s*([\s\S]*?)(?=<START>|$)/g), (m) =>
        m[1].trim(),
    ).filter(Boolean);
}

function formatExamples(
    block: string,
    index: number,
    characterName: string,
): { key: number; content: string } {
    const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
            const match = line.match(/^{{(char|user)}}\s*:(.*)$/);
            if (!match) return line;

            const [_, role, textRaw] = match;
            const text = textRaw.trim();
            const other = role === "char" ? "user" : "char";
            const hasOther = new RegExp(`^{{${other}}}\\s*:`, "m").test(block);
            const speaker = role === "char" ? characterName : "(You)";
            return hasOther ? `**${speaker}:** ${text}` : text;
        });

    const first = `${index + 1}.`;
    const nested = lines.map((l) => `    - ${l}`).join("\n");
    return { key: index, content: [first, nested].filter(Boolean).join("\n") };
}

interface ExampleDialogueProps {
    character: CharacterRecord;
    editing: Boolean;
}

export default function ExampleDialogue({
    character,
    editing,
}: ExampleDialogueProps) {
    const [exampleMessages, setExampleMessages] = useState(
        character.data.mes_example,
    );

    const formattedExamples = extractExamples(exampleMessages).map(
        (block, index) => formatExamples(block, index, character.data.name),
    );

    const save = async (value: string) => {
        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                record.data.mes_example = value;
            });
        toast.success(`Example dialogue saved.`);
    };

    if (editing) {
        return (
            <Card>
                <CardContent>
                    <Textarea
                        autoFocus
                        value={exampleMessages}
                        onChange={(e) =>
                            setExampleMessages(e.currentTarget.value)
                        }
                        onBlur={() => save(exampleMessages)}
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="py-4">
            <CardContent className="">
                {formattedExamples.length ? (
                    formattedExamples.map(({ key, content }) => (
                        <Prose
                            key={key}
                            className="text-[var(--tw-prose-body)] [&_li]:pl-1 [&_ul]:pl-0 [&_ul_li::marker]:text-[transparent]"
                        >
                            {content}
                        </Prose>
                    ))
                ) : (
                    <Prose>
                        *No example dialogue… yet. Click to add some!*
                    </Prose>
                )}
            </CardContent>
        </Card>
    );
}
