import { PromptEditor } from "@/components/settings/prompts/editor";
import { PromptList } from "@/components/settings/prompts/list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettingsContext } from "@/contexts/settings-context";

export default function PromptSettings() {
    const { updateSettings } = useSettingsContext();
    const [selected, setSelected] = useState<string | null>(null);

    const setPrompt = (prompt: string) => {
        setSelected(prompt);
        updateSettings({ promptSet: prompt });
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 h-[calc(100vh-200px)]">
                {/* List Panel */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    <CardTitle>Prompt Sets</CardTitle>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setSelected(null)}
                                    className="lg:hidden"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <ScrollArea className="h-full">
                                <div className="px-4">
                                    <PromptList onSelect={setPrompt} />
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Editor Panel */}
                <div className="lg:col-span-4">
                    <div className="h-full">
                        {selected !== null ? (
                            <>
                                <PromptEditor
                                    promptSetId={selected}
                                    onDone={() => setSelected(null)}
                                />
                            </>
                        ) : (
                            <Card className="h-full flex items-center justify-center">
                                <CardContent className="text-center space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold">
                                            No Prompt Set Selected
                                        </h3>
                                        <p className="text-muted-foreground max-w-sm">
                                            Select a prompt set from the list to
                                            edit it, or create a new one to get
                                            started.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
