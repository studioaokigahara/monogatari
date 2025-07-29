import { Prose } from "@/components/prose";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CharacterRecord } from "@/database/schema/character";
import { Plus, Trash } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCharacterForm } from "@/contexts/character-form-context";
import { useField, useStore } from "@tanstack/react-form";

interface GreetingsProps {
    character?: CharacterRecord | null;
}

export default function Greetings({ character }: GreetingsProps) {
    const { form, editing } = useCharacterForm();

    const firstMesField = useField({ form, name: "first_mes" });
    const alternateGreetingsField = useField({
        form,
        name: "alternate_greetings",
        mode: "array"
    });

    const greetings = editing
        ? [
              character?.data.first_mes,
              ...(character?.data.alternate_greetings ?? [])
          ]
        : useStore(form.store, (state) => [
              state.values.first_mes,
              ...(state.values.alternate_greetings ?? [])
          ]);

    const [activeTab, setActiveTab] = useState<string>("greeting-1");
    const activeIndex = useMemo(() => {
        const index = Number(activeTab.split("-")[1]) - 1;
        return Math.max(0, Math.min(greetings.length - 1, index));
    }, [activeTab, greetings.length]);

    const handleBlur = useCallback(() => {
        if (activeIndex === 0) firstMesField.handleBlur();
        else alternateGreetingsField.handleBlur();
    }, [activeIndex, firstMesField, alternateGreetingsField]);

    const updateGreeting = (value: string) => {
        if (activeIndex === 0) firstMesField.handleChange(value);
        else {
            const next = [...alternateGreetingsField.state.value];
            next[activeIndex - 1] = value;
            alternateGreetingsField.handleChange(next);
        }
    };

    const addGreeting = () => {
        alternateGreetingsField.pushValue("");
        setActiveTab(`greeting-${greetings.length + 1}`);
        toast.success("Added new greeting.");
    };

    const deleteGreeting = () => {
        if (activeIndex === 0) {
            toast.error("You can't delete the first greeting, dummy.");
            return;
        }

        alternateGreetingsField.removeValue(activeIndex - 1);
        setActiveTab(`greeting-${activeIndex}`);
        toast.success(`Deleted greeting ${activeIndex + 1}.`);
    };

    return (
        <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="overflow-x-auto">
                    <TabsList className="bg-muted/50 rounded-full *:rounded-full">
                        {greetings.map((_, idx) => (
                            <TabsTrigger
                                key={idx}
                                value={`greeting-${idx + 1}`}
                            >
                                Greeting {idx + 1}
                            </TabsTrigger>
                        ))}
                        {editing && (
                            <>
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
                            </>
                        )}
                    </TabsList>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    {editing ? (
                        <Textarea
                            value={greetings[activeIndex]}
                            onChange={(e) =>
                                updateGreeting(e.currentTarget.value)
                            }
                            onBlur={handleBlur}
                            minRows={6}
                            placeholder="Write a message..."
                            className="font-mono text-sm"
                            autoFocus
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
