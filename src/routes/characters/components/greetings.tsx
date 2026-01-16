import { Markdown } from "@/components/markdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Character } from "@/database/schema/character";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function Greetings({ character }: { character: Character }) {
    const greetings = [
        character.data.first_mes,
        ...(character.data.alternate_greetings ?? [])
    ];

    const [activeTab, setActiveTab] = useState<string>("greeting-1");
    const activeIndex = useMemo(() => {
        const index = Number(activeTab.split("-")[1]) - 1;
        return Math.max(0, Math.min(greetings.length - 1, index));
    }, [activeTab, greetings.length]);

    const tabTriggers = greetings.map((greeting, index) => (
        <TabsTrigger key={greeting.slice(0, 9)} value={`greeting-${index + 1}`}>
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
                    <Markdown>
                        {greetings[activeIndex] || "*Click to add greeting...*"}
                    </Markdown>
                </CardContent>
            </Tabs>
        </Card>
    );
}
