import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCharacterForm } from "@/contexts/character-form-context";
import { CharacterRecord } from "@/database/schema/character";

function extractExamples(raw: string): string[] {
    return Array.from(
        raw.matchAll(/<START>\s*([\s\S]*?)(?=<START>|$)/g),
        (matches) => matches[1].trim()
    ).filter(Boolean);
}

function formatExamples(
    block: string,
    index: number,
    characterName: string
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
    character?: CharacterRecord | null;
}

export default function ExampleDialogue({ character }: ExampleDialogueProps) {
    const { form, editing } = useCharacterForm();

    const formattedExamples = extractExamples(
        character?.data.mes_example ?? ""
    ).map((block, index) =>
        formatExamples(block, index, character?.data.name || "Character")
    );

    if (editing)
        return (
            <Card>
                <CardContent>
                    <form.Field
                        name="mes_example"
                        children={(field) => (
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                minRows={8}
                                placeholder={`<START>\n{{char}}: Hello!\n{{user}}: Hi!`}
                                className="font-mono text-sm"
                                autoFocus
                            />
                        )}
                    />
                </CardContent>
            </Card>
        );

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
                    <Prose>*No example dialogue... yet.*</Prose>
                )}
            </CardContent>
        </Card>
    );
}
