import { Prose } from "@/components/prose";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CharacterManager } from "@/database/characters";

interface GreetingsProps {
    character: CharacterRecord | null;
    editing: boolean;
    isNewMode?: boolean;
    formData?: Partial<CharacterRecord["data"]>;
    onUpdate?: (data: Partial<CharacterRecord["data"]>) => void;
}

export default function Greetings({
    character,
    editing,
    isNewMode = false,
    formData,
    onUpdate
}: GreetingsProps) {
    const [greetings, setGreetings] = useState<string[]>(
        isNewMode
            ? [
                  formData?.first_mes || "",
                  ...(formData?.alternate_greetings || [])
              ]
            : [
                  character?.data.first_mes || "",
                  ...(character?.data.alternate_greetings || [])
              ]
    );
    const [activeTab, setActiveTab] = useState<string>("greeting-1");
    const activeIndex = useMemo(() => {
        const index = Number(activeTab.split("-")[1]) - 1;
        return Math.max(0, Math.min(greetings.length - 1, index));
    }, [activeTab, greetings.length]);

    const saveGreeting = async (value: string) => {
        const updated = [...greetings];
        updated[activeIndex] = value;
        setGreetings(updated);

        if (isNewMode && onUpdate) {
            onUpdate({
                first_mes: updated[0],
                alternate_greetings: updated.slice(1)
            });
            return;
        }

        if (character) {
            if (activeIndex === 0) {
                await CharacterManager.updateField(
                    character.id,
                    "first_mes",
                    updated[0]
                );
            } else {
                await CharacterManager.updateField(
                    character.id,
                    "alternate_greetings",
                    updated.slice(1)
                );
            }
            toast.success(`Saved greeting ${activeIndex + 1}`);
        }
    };

    const addGreeting = async () => {
        const updated = [...greetings, ""];
        setGreetings(updated);
        setActiveTab(`greeting-${updated.length}`);

        if (isNewMode && onUpdate) {
            onUpdate({
                first_mes: updated[0],
                alternate_greetings: updated.slice(1)
            });
            return;
        }

        if (character) {
            await CharacterManager.updateField(
                character.id,
                "alternate_greetings",
                updated.slice(1)
            );

            toast.success("Added new greeting.");
        }
    };

    const deleteGreeting = async () => {
        if (activeIndex === 0) {
            toast.error("You can't delete the first greeting, dummy.");
            return;
        }

        const updated = greetings.filter((_, i) => i !== activeIndex);
        setGreetings(updated);
        setActiveTab(`greeting-${activeIndex}`);

        if (isNewMode && onUpdate) {
            onUpdate({
                first_mes: updated[0],
                alternate_greetings: updated.slice(1)
            });
            return;
        }

        if (character) {
            await CharacterManager.updateField(
                character.id,
                "alternate_greetings",
                updated.slice(1)
            );

            toast.success(`Deleted greeting ${activeIndex + 1}.`);
        }
    };

    return (
        <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="overflow-x-auto">
                    <TabsList className="bg-muted/50 rounded-full *:rounded-full *:cursor-pointer">
                        {greetings.map((_, idx) => (
                            <TabsTrigger
                                key={idx}
                                value={`greeting-${idx + 1}`}
                            >
                                Greeting {idx + 1}
                            </TabsTrigger>
                        ))}
                        <TabsTrigger
                            value="greeting-new"
                            onClick={(e) => {
                                e.preventDefault();
                                addGreeting();
                            }}
                        >
                            <Plus />
                        </TabsTrigger>
                        <TabsTrigger
                            data-state="inactive"
                            value={activeTab}
                            onClick={(e) => {
                                e.preventDefault();
                                deleteGreeting();
                            }}
                        >
                            <Trash />
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    {editing ? (
                        <Textarea
                            autoFocus
                            value={greetings[activeIndex]}
                            onChange={(e) => {
                                const draft = [...greetings];
                                draft[activeIndex] = e.currentTarget.value;
                                setGreetings(draft);
                                if (isNewMode && onUpdate) {
                                    onUpdate({
                                        first_mes: draft[0],
                                        alternate_greetings: draft.slice(1)
                                    });
                                }
                            }}
                            onBlur={(e) => saveGreeting(e.currentTarget.value)}
                            minRows={6}
                            placeholder="Write how your character greets someone..."
                            className="font-mono text-sm"
                        />
                    ) : (
                        <Prose>
                            {greetings[activeIndex] ||
                                "*Click to add greeting...*"}
                        </Prose>
                    )}
                </CardContent>
            </Tabs>
        </Card>
    );
}
