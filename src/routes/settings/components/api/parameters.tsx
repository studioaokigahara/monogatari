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
            <CardContent className="space-y-4">
                {model?.supports?.streaming && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="streaming">Streaming</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
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
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="max-tokens">Maximum Output Tokens</Label>
                            <Tooltip>
                                <TooltipTrigger
                                    render={<Info className="ml-2 size-4 text-muted-foreground" />}
                                />
                                <TooltipContent className="max-w-xs">
                                    Controls the maximum number of tokens returned from the API. One
                                    token is roughly 4 characters of English text.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {settings.maxOutputTokens}
                        </span>
                    </div>
                    <Slider
                        id="max-tokens"
                        min={256}
                        max={model?.maxOutputTokens}
                        step={256}
                        value={settings.maxOutputTokens}
                        onValueChange={(value) => {
                            updateSettings((settings) => {
                                settings.maxOutputTokens = value as number;
                            });
                        }}
                    />
                </div>
                {samplerSet.has("temperature") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="temperature">Temperature</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="max-w-xs">
                                        Scales the logits of each token by dividing them by
                                        temperature. Lower values concentrate the probability mass
                                        in the most likely tokens, producing more deterministic
                                        outputs, and higher values flatten the probability mass,
                                        producing more stochastic outputs. Set to 1 for the original
                                        probabilities.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.temperature}
                            </span>
                        </div>
                        <Slider
                            id="temperature"
                            min={0}
                            max={lowTemp ? 1 : 2}
                            step={0.01}
                            value={settings.samplers.temperature}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.temperature = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("frequencyPenalty") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="freqPen">Frequency Penalty</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="max-w-xs">
                                        Penalize tokens that have already appeared in context by
                                        subtracting (freq_pen * token_count) from those token's
                                        probabilities. Set to 0 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.frequencyPenalty}
                            </span>
                        </div>
                        <Slider
                            id="freqPen"
                            min={-2}
                            max={2}
                            step={0.01}
                            value={settings.samplers.frequencyPenalty}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.frequencyPenalty = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("presencePenalty") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="presPen">Presence Penalty</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="w-fit">
                                        Penalize tokens that have already appeared in context by
                                        subtracting pres_pen from those token's probabilities. Set
                                        to 0 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.presencePenalty}
                            </span>
                        </div>
                        <Slider
                            id="presPen"
                            min={-2}
                            max={2}
                            step={0.01}
                            value={settings.samplers.presencePenalty}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.presencePenalty = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("topK") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="top_k">Top-K</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="max-w-xs">
                                        Only select from the first top_k options for each token. Set
                                        to 0 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.topK}
                            </span>
                        </div>
                        <Slider
                            id="top_k"
                            min={0}
                            max={Infinity}
                            step={1}
                            value={settings.samplers.topK}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topK = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("topP") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="topP">Top-P</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="max-w-xs">
                                        Sums the probabilities of every option for each token in
                                        decreasing order and cuts off the tail of the distribution
                                        once the probability sum reaches top_p%. Also known as
                                        nucleus sampling. Set to 1 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.topP}
                            </span>
                        </div>
                        <Slider
                            id="topP"
                            min={0}
                            max={1}
                            step={0.01}
                            value={settings.samplers.topP}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topP = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("repetitionPenalty") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="repPen">Repetition Penalty</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    ></TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Penalize tokens that have already appeared in context by
                                        dividing those token's probabilities by
                                        (rep_pen^token_count). Set to 1 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.repetitionPenalty}
                            </span>
                        </div>
                        <Slider
                            id="repPen"
                            min={0}
                            max={2}
                            step={0.01}
                            value={settings.samplers.repetitionPenalty}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.repetitionPenalty = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("minP") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="min_p">Min-P</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                                        }
                                    />
                                    <TooltipContent className="max-w-xs">
                                        Only consider tokens whose probability is at least min_p% of
                                        the top token's probability. Set to 0 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.minP}
                            </span>
                        </div>
                        <Slider
                            id="min_p"
                            min={0}
                            max={1}
                            step={0.01}
                            value={settings.samplers.minP}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.minP = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {samplerSet.has("topA") && (
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Label htmlFor="top_a">Top-A</Label>
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Info className="ml-2 size-4 text-muted-foreground" />
                                        }
                                    ></TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Only consider tokens whose probability is at least
                                        (top_token_probability^2 * top_a). Set to 0 to disable.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {settings.samplers.topA}
                            </span>
                        </div>
                        <Slider
                            id="top_a"
                            min={0}
                            max={1}
                            step={0.01}
                            value={settings.samplers.topA}
                            onValueChange={(value) => {
                                updateSettings((settings) => {
                                    settings.samplers.topA = value as number;
                                });
                            }}
                        />
                    </div>
                )}
                {(settings.provider === "anthropic" || model?.id.split("/")[0] === "anthropic") && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label htmlFor="cacheDepth">Cache Depth</Label>
                            <Tooltip>
                                <TooltipTrigger
                                    render={<Info className="ml-2 size-4 text-muted-foreground" />}
                                />
                                <TooltipContent className="max-w-xs">
                                    Controls the cache breakpoint depth. A depth of 2 will insert
                                    the breakpoint 2 messages from the bottom; the first and second
                                    messages will not be cached, and any change above the second
                                    message will result in a cache miss. It is recommended to keep
                                    cache depth set to a very low even number like 0 or 2.
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
