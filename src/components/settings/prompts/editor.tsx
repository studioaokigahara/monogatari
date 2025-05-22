import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPrompt, savePrompt } from "@/database/prompts";
import { useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function PromptEditor() {
    const { id } = useParams<{ id?: string }>();
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [template, setTemplate] = useState("");

    useEffect(() => {
        if (id) {
            getPrompt(id).then((p) => {
                if (p) {
                    setName(p.name);
                    setDescription(p.description || "");
                    setTemplate(p.template);
                }
            });
        }
    }, [id]);

    const onSave = async () => {
        await savePrompt({ id: id || undefined!, name, description, template });
        router.navigate({ to: "/settings/prompts" });
    };

    return (
        <div className="space-y-4">
            <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
            />
            <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <Textarea
                className="h-48"
                placeholder="Your prompt template (use {{char}} and {{user}} macros)…"
                value={template}
                onChange={(e) => setTemplate(e.currentTarget.value)}
            />
            <div className="flex gap-2">
                <Button onClick={onSave}>Save</Button>
                <Button
                    variant="outline"
                    onClick={() => router.navigate({ to: "/settings/prompts" })}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
