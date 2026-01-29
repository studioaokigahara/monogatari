import { Markdown } from "@/components/markdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Character } from "@/database/schema/character";
import { cn, FNV1a } from "@/lib/utils";
import { useState } from "react";

export function Greetings({ character }: { character: Character }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const greetings = [character.data.first_mes, ...character.data.alternate_greetings];

    const tabTriggers = greetings.map((greeting, index) => (
        <TabsTrigger key={FNV1a(greeting)} value={index}>
            Greeting {index + 1}
        </TabsTrigger>
    ));

    return (
        <Card className="overflow-hidden">
            <Tabs value={activeIndex} onValueChange={setActiveIndex}>
                <CardHeader>
                    <TabsList
                        variant="line"
                        className={cn(
                            greetings.length > 10 && "flex h-auto flex-wrap justify-start *:flex-0"
                        )}
                    >
                        {tabTriggers}
                    </TabsList>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    <Markdown>{greetings[activeIndex] || "*No greetings?*"}</Markdown>
                </CardContent>
            </Tabs>
        </Card>
    );
}
