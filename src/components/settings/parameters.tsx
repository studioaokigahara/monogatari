import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettingsContext } from "@/contexts/settings-context";
import { getCheckpoint, getModel } from "@/types/registry";
import { Info } from "lucide-react";

export default function Parameters() {
    const { settings, updateSettings } = useSettingsContext();
    const P = settings.provider as Settings["provider"];

    const selectedModel = getModel(settings.provider, settings.models[P]);
    const selectedCheckpoint = getCheckpoint(
        settings.provider,
        settings.models[P],
    );
    const currentModel = { ...selectedModel, ...selectedCheckpoint };
    const supportedFeatures = {
        ...selectedModel?.supports,
        ...selectedCheckpoint?.supports,
    };

    console.log(currentModel);

    return (
        <Card>
            <CardHeader className="flex justify-between">
                <CardTitle>Generation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {supportedFeatures.streaming && (
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center">
                                <Label htmlFor="streaming">Streaming</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            Stream tokens as they're generated
                                            instead of waiting for the complete
                                            response.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <Switch
                            id="streaming"
                            checked={settings.streaming}
                            onCheckedChange={(value) =>
                                updateSettings({
                                    streaming: value,
                                })
                            }
                        />
                    </div>
                )}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center">
                                <Label htmlFor="max-tokens">
                                    Maximum Output Tokens
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            The maximum number of tokens to
                                            generate. One token is roughly 4
                                            characters of English text.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <span className="font-mono text-sm">
                            {settings.maxOutputTokens}
                        </span>
                    </div>
                    <Slider
                        id="max-tokens"
                        min={256}
                        max={currentModel?.maxOutputTokens}
                        step={256}
                        value={[settings.maxOutputTokens]}
                        onValueChange={(value) =>
                            updateSettings({
                                maxOutputTokens: value[0],
                            })
                        }
                        className="w-full"
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center">
                                <Label htmlFor="temperature">Temperature</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            Lower values produce more
                                            deterministic outputs, higher values
                                            produce more creative outputs.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <span className="font-mono text-sm">
                            {settings.temperature}
                        </span>
                    </div>
                    <Slider
                        id="temperature"
                        min={0}
                        max={settings.provider === "openai" ? 2 : 1}
                        step={0.1}
                        value={[settings.temperature]}
                        onValueChange={(value) =>
                            updateSettings({
                                temperature: value[0],
                            })
                        }
                        className="w-full"
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center">
                                <Label htmlFor="top_p">Top-P</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            Nucleus sampling. Sums the
                                            probabilities of every option for
                                            each token in decreasing order and
                                            cuts off the 'tail' once the
                                            probability sum reaches top_p.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <span className="font-mono text-sm">
                            {settings.top_p}
                        </span>
                    </div>
                    <Slider
                        id="top_p"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[settings.top_p]}
                        onValueChange={(value) =>
                            updateSettings({
                                top_p: value[0],
                            })
                        }
                        className="w-full"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
