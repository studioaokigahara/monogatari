import { Markdown } from "@/components/markdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Character } from "@/database/schema/character";
import { cn } from "@/lib/utils";

export function Description({ character }: { character: Character }) {
    const showTabs =
        character.data.personality ||
        character.data.scenario ||
        character.data.system_prompt ||
        character.data.post_history_instructions;
    return (
        <Card>
            <Tabs defaultValue="description">
                <CardHeader className={cn(!showTabs && "hidden")}>
                    <TabsList>
                        <TabsTrigger value="description">
                            Description
                        </TabsTrigger>
                        {character.data.personality && (
                            <TabsTrigger value="personality">
                                Personality
                            </TabsTrigger>
                        )}
                        {character.data.scenario && (
                            <TabsTrigger value="scenario">Scenario</TabsTrigger>
                        )}
                        {character.data.system_prompt && (
                            <TabsTrigger value="system_prompt">
                                System Prompt
                            </TabsTrigger>
                        )}
                        {character.data.post_history_instructions && (
                            <TabsTrigger value="post_history_instructions">
                                Post-History Instructions
                            </TabsTrigger>
                        )}
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <TabsContent value="description">
                        <Markdown>{character.data.description}</Markdown>
                    </TabsContent>
                    {character.data.personality && (
                        <TabsContent value="personality">
                            <Markdown>{character.data.personality}</Markdown>
                        </TabsContent>
                    )}
                    {character.data.scenario && (
                        <TabsContent value="scenario">
                            <Markdown>{character.data.scenario}</Markdown>
                        </TabsContent>
                    )}
                    {character.data.system_prompt && (
                        <TabsContent value="system_prompt">
                            <Markdown>{character.data.system_prompt}</Markdown>
                        </TabsContent>
                    )}
                    {character.data.post_history_instructions && (
                        <TabsContent value="post_history_instructions">
                            <Markdown>
                                {character.data.post_history_instructions}
                            </Markdown>
                        </TabsContent>
                    )}
                    {!character.data.description &&
                        !character.data.personality &&
                        !character.data.scenario && (
                            <Markdown>
                                Click edit to add character details...
                            </Markdown>
                        )}
                </CardContent>
            </Tabs>
        </Card>
    );
}
