import { Prose } from "@/components/prose";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Character } from "@/database/schema/character";
import { Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useField, useStore } from "@tanstack/react-form";
import { cn } from "@/lib/utils";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";

interface GreetingsProps {
    character: Character;
}

export function Greetings({ character }: GreetingsProps) {
    const greetings = [
        character.data.first_mes,
        ...(character.data.alternate_greetings ?? [])
    ];

    const [activeTab, setActiveTab] = useState<string>("greeting-1");
    const activeIndex = useMemo(() => {
        const index = Number(activeTab.split("-")[1]) - 1;
        return Math.max(0, Math.min(greetings.length - 1, index));
    }, [activeTab, greetings.length]);

    const tabTriggers = greetings.map((_, index) => (
        <TabsTrigger key={index} value={`greeting-${index + 1}`}>
            Greeting {index + 1}
        </TabsTrigger>
    ));

    return (
        <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader>
                    <TabsList
                        className={cn(
                            greetings.length > 10 &&
                                "h-auto flex flex-wrap justify-start *:flex-0"
                        )}
                    >
                        {tabTriggers}
                    </TabsList>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    <Prose>
                        {greetings[activeIndex] || "*Click to add greeting...*"}
                    </Prose>
                </CardContent>
            </Tabs>
        </Card>
    );
}

export const GreetingsField = withCharacterForm({
    ...characterFormOptions,
    render: function Render({ form }) {
        const alternateGreetingsField = useField({
            form,
            name: "alternate_greetings",
            mode: "array"
        });

        const greetings = useStore(form.store, (state) => [
            state.values.first_mes,
            ...(state.values.alternate_greetings ?? [])
        ]);

        const [activeTab, setActiveTab] = useState("greeting-1");
        const activeIndex = useMemo(() => {
            const index = Number(activeTab.split("-")[1]) - 1;
            return Math.max(0, Math.min(greetings.length - 1, index));
        }, [activeTab, greetings.length]);

        const addGreeting = () => {
            alternateGreetingsField.pushValue("" as string as never);
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
                    <CardHeader>
                        <TabsList
                            className={cn(
                                greetings.length > 10
                                    ? "h-auto flex flex-wrap justify-start *:flex-0"
                                    : ""
                            )}
                        >
                            {greetings.map((_, idx) => (
                                <TabsTrigger
                                    key={idx}
                                    value={`greeting-${idx + 1}`}
                                >
                                    Greeting {idx + 1}
                                </TabsTrigger>
                            ))}
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
                        </TabsList>
                    </CardHeader>
                    <CardContent className="overflow-y-auto">
                        <form.AppField
                            name={
                                activeIndex === 0
                                    ? "first_mes"
                                    : `alternate_greetings[${activeIndex - 1}]`
                            }
                        >
                            {(field) => (
                                <Textarea
                                    key={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.currentTarget.value
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                    placeholder="Write a message..."
                                    className="font-mono text-sm"
                                    autoFocus
                                />
                            )}
                        </form.AppField>
                    </CardContent>
                </Tabs>
            </Card>
        );
    }
});
