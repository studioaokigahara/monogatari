import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
import { getModel, PROVIDER_REGISTRY } from "@/types/registry";
import { Settings } from "@/types/settings";
import { Info, Settings2 } from "lucide-react";
import { useEffect } from "react";

export default function Parameters() {
    const { settings, updateSettings } = useSettings();
    const provider = settings.provider as Settings["provider"];

    const model = getModel(provider, settings.models[provider] as string);

    const samplerSet = new Set(
        provider === "openrouter"
            ? (PROVIDER_REGISTRY[model?.id.split("/")[0] as Settings["provider"]]?.samplers ??
                  PROVIDER_REGISTRY[provider].samplers)
            : PROVIDER_REGISTRY[provider].samplers
    );
    const lowTemp = provider === "anthropic" || model?.id.split("/")[0] === "anthropic";

    // TODO: per-provider sampler settings
    useEffect(() => {
        if (model && settings.maxOutputTokens > model.maxOutputTokens) {
            updateSettings((settings) => {
                settings.maxOutputTokens = model.maxOutputTokens;
            });
        }

        if (lowTemp && settings.samplers.temperature > 1) {
            updateSettings((settings) => {
                settings.samplers.temperature = 1;
            });
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings2 />
                    Samplers
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {model?.supports?.streaming && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="streaming">Streaming</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 size-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Stream tokens as they're generated instead of waiting for
                                        the complete response.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Switch
                            id="streaming"
                            checked={settings.streaming}
                            onCheckedChange={(value) => {
                                updateSettings((settings) => {
                                    settings.streaming = value;
                                });
                            }}
                        />
                    </div>
                )}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="max-tokens">Maximum Output Tokens</Label>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="ml-2 size-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    One token is roughly 4 characters of English text.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <span className="font-mono text-sm">{settings.maxOutputTokens}</span>
                    </div>
                    <Slider
                        id="max-tokens"
                        min={256}
                        max={model?.maxOutputTokens}
                        step={256}
                        value={[settings.maxOutputTokens]}
                        onValueChange={(value) => {
                            updateSettings((settings) => {
                                settings.maxOutputTokens = value[0];
                            });
                        }}
                        className="w-full"
                    />
                </div>
                {samplerSet.has("temperature") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="temperature">Temperature</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 size-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Lower values produce more deterministic outputs, higher
                                        values produce more stochastic outputs.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">
                                {settings.samplers.temperature}
                            </span>
                        </div>
                        <Slider
                            id="temperature"
                            min={0}
                            max={lowTemp ? 1 : 2}
                            step={0.01}
                            value={[settings.samplers.temperature]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.temperature = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("frequencyPenalty") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="freqPen">Frequency Penalty</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Penalizes token probabilities proportionate to the number of
                                        times the token appears in context.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">
                                {settings.samplers.frequencyPenalty}
                            </span>
                        </div>
                        <Slider
                            id="freqPen"
                            min={-2}
                            max={2}
                            step={0.01}
                            value={[settings.samplers.frequencyPenalty]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.frequencyPenalty = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("presencePenalty") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="presPen">Presence Penalty</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="w-fit">
                                        Applies a flat penalty to tokens that have already appeared
                                        in context.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">
                                {settings.samplers.presencePenalty}
                            </span>
                        </div>
                        <Slider
                            id="presPen"
                            min={-2}
                            max={2}
                            step={0.01}
                            value={[settings.samplers.presencePenalty]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.presencePenalty = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("topK") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="top_k">Top-K</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Only select from the top_k options for each token.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">{settings.samplers.topK}</span>
                        </div>
                        <Slider
                            id="top_k"
                            min={0}
                            max={Infinity}
                            step={1}
                            value={[settings.samplers.topK]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topK = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("topP") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="topP">Top-P</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Nucleus sampling. Sums the probabilities of every option for
                                        each token in decreasing order and cuts off the 'tail' once
                                        the probability sum reaches top_p.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">{settings.samplers.topP}</span>
                        </div>
                        <Slider
                            id="topP"
                            min={0}
                            max={1}
                            step={0.01}
                            value={[settings.samplers.topP]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topP = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("repetitionPenalty") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="repPen">Repetition Penalty</Label>
                                {/*<Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    Applies a flat penalty to tokens that have already appeared in context.
                                </TooltipContent>
                            </Tooltip>*/}
                            </div>
                            <span className="font-mono text-sm">
                                {settings.samplers.repetitionPenalty}
                            </span>
                        </div>
                        <Slider
                            id="repPen"
                            min={0}
                            max={2}
                            step={0.01}
                            value={[settings.samplers.repetitionPenalty]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.repetitionPenalty = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("minP") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="min_p">Min-P</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Only considers tokens whose probabilities are at least min_p
                                        % of the top token's probability.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="font-mono text-sm">{settings.samplers.minP}</span>
                        </div>
                        <Slider
                            id="min_p"
                            min={0}
                            max={1}
                            step={0.01}
                            value={[settings.samplers.minP]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.minP = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {samplerSet.has("topA") && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="top_a">Top-A</Label>
                                {/*<Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="size-4 ml-2 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    Only considers tokens whose probabilities are at least min_p % of the top token's probability.
                                </TooltipContent>
                            </Tooltip>*/}
                            </div>
                            <span className="font-mono text-sm">{settings.samplers.topA}</span>
                        </div>
                        <Slider
                            id="top_a"
                            min={0}
                            max={1}
                            step={0.01}
                            value={[settings.samplers.topA]}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topA = value[0];
                                });
                            }}
                            className="w-full"
                        />
                    </div>
                )}
                {(settings.provider === "anthropic" || model?.id.split("/")[0] === "anthropic") && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="cacheDepth">Cache Depth</Label>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="ml-2 size-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    Set the cache breakpoint depth. A depth of 2 will insert the
                                    breakpoint 2 messages from the bottom; messages 0 and 1 will not
                                    be cached, and any change above message 1 will result in a cache
                                    miss.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <Input
                            id="cacheDepth"
                            type="number"
                            min={0}
                            max={1000}
                            step={2}
                            value={settings.cacheDepth}
                            onChange={(event) => {
                                updateSettings((settings) => {
                                    settings.cacheDepth = Number(event.target.value);
                                });
                            }}
                            className="w-min"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
