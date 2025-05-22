import { Markdown } from "@/components/markdown";
import { useCharacterContext } from "@/contexts/character-context";
import React from "react";

interface PreviewProps {
    template: string;
}

export default function PromptPreview({ template }: PreviewProps) {
    const { character } = useCharacterContext();
    const dummyUser = "(You)";
    return (
        <div className="prose p-4 border rounded">
            <Markdown id="prompt-preview" urlTransform={(url) => url}>
                {template}
            </Markdown>
        </div>
    );
}
