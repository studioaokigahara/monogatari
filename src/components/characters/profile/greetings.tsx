import { Prose } from "@/components/prose";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface GreetingsProps {
    character: CharacterRecord;
    editing: boolean;
}

export default function Greetings({ character, editing }: GreetingsProps) {
    const [greetings, setGreetings] = useState<string[]>([
        character.data.first_mes,
        ...character.data.alternate_greetings,
    ]);
    const [activeTab, setActiveTab] = useState<string>("greeting-1");
    const activeIndex = useMemo(() => {
        const index = Number(activeTab.split("-")[1]) - 1;
        return Math.max(0, Math.min(greetings.length - 1, index));
    }, [activeTab, greetings.length]);

    const saveGreeting = async (value: string) => {
        const updated = [...greetings];
        updated[activeIndex] = value;
        setGreetings(updated);

        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                if (activeIndex === 0) record.data.first_mes = value;
                else record.data.alternate_greetings = updated.slice(1);
            });

        toast.success(`Saved greeting ${activeIndex + 1}`);
    };

    const addGreeting = async () => {
        const updated = [...greetings, ""];
        setGreetings(updated);
        setActiveTab(`greeting-${updated.length}`);

        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                record.data.alternate_greetings = updated.slice(1);
            });

        toast.success("Added new greeting.");
    };

    const deleteGreeting = async () => {
        if (activeIndex === 0) {
            toast.error("You can't delete the first greeting, dummy.");
            return;
        }

        const updated = greetings.filter((_, i) => i !== activeIndex);
        setGreetings(updated);
        setActiveTab(`greeting-${activeIndex}`);

        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                record.data.alternate_greetings = updated.slice(1);
            });

        toast.success(`Deleted greeting ${activeIndex + 1}.`);
    };

    return (
        <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="overflow-x-auto">
                    <TabsList className="bg-muted/50">
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
                            }}
                            onBlur={(e) => saveGreeting(e.currentTarget.value)}
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
