import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPrompts } from "@/database/prompts";
import { useRouter } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";

export default function PromptList() {
    const prompts = useLiveQuery(() => listPrompts(), []);
    const router = useRouter();

    return (
        <Card>
            <CardHeader className="flex justify-between items-center">
                <CardTitle>Prompt Templates</CardTitle>
                <Button
                    size="sm"
                    onClick={() =>
                        router.navigate({ to: "/settings/prompts/new" })
                    }
                >
                    <Plus />
                    New Prompt
                </Button>
            </CardHeader>
            {prompts?.map((p) => (
                <Card key={p.id} className="mb-2">
                    <CardHeader>
                        <CardTitle>{p.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2">
                        <Button
                            size="sm"
                            onClick={() =>
                                router.navigate({
                                    to: `/settings/prompts/${p.id}`,
                                })
                            }
                        >
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePrompt(p.id)}
                        >
                            Delete
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </Card>
    );
}
