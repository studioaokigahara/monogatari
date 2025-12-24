import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Character } from "@/database/schema/character";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";

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
): string {
    const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
            const match = line.match(/^{{(char|user)}}\s*:(.*)$/);
            const otherSpeakers = /^(?!{{char}}:).+:/m.test(block);

            if (match) {
                const [_, role, textRaw] = match;
                const text = textRaw.trim();
                const speaker = role === "char" ? characterName : "(You)";
                return otherSpeakers ? `**${speaker}:** ${text}` : text;
            }

            if (otherSpeakers) {
                const otherMatch = line.match(/^([^:]+):\s*(.*)$/);
                if (otherMatch) {
                    const [_, name, text] = otherMatch;
                    return `**${name}:** ${text}`;
                }
            }

            return line;
        });

    const first = `${index + 1}.`;
    const nested = lines.map((l) => `    - ${l}`).join("\n");
    return [first, nested].filter(Boolean).join("\n");
}

export function ExampleDialogue({ character }: { character: Character }) {
    const formattedExamples = extractExamples(character.data.mes_example).map(
        (block, index) => formatExamples(block, index, character.data.name)
    );

    const exampleDialogue = formattedExamples.map((example, index) => (
        <Prose
            key={index}
            className="text-(--tw-prose-body) [&_li]:pl-0 [&_li]:mb-[1lh] [&_ul]:pl-0 [&_ul_li::marker]:text-transparent"
        >
            {example}
        </Prose>
    ));

    return (
        <Card className="py-4">
            <CardContent className="">
                {formattedExamples.length ? (
                    <>{exampleDialogue}</>
                ) : (
                    <Prose>*No example dialogue... yet.*</Prose>
                )}
            </CardContent>
        </Card>
    );
}

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
