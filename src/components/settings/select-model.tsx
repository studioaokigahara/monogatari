import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSettingsContext } from "@/contexts/settings-context";
import { formatNumber } from "@/lib/utils";
import {
    MODEL_REGISTRY,
    PROVIDER_REGISTRY,
    getCheckpoint,
    getModel,
} from "@/types/registry";
import { Settings } from "@/types/settings";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Password from "../password-input";

export default function SelectModel() {
    const { settings, updateSettings } = useSettingsContext();
    const P = settings.provider as Settings["provider"];
    const fallback =
        PROVIDER_REGISTRY[P].models[0]?.checkpoints?.[0]?.id ??
        PROVIDER_REGISTRY[P].models[0]?.id ??
        "";

    useEffect(() => {
        if (!settings.models[P]) {
            const registry = PROVIDER_REGISTRY[P].models;
            const fallback =
                registry[0]?.checkpoints?.[0]?.id ?? registry[0]?.id ?? "";
            updateSettings({
                models: { ...settings.models, [P]: fallback },
            });
        }
    }, [P]);

    const onProviderChange = (provider: Settings["provider"]) => {
        updateSettings({ provider });
    };

    const providerModels = useMemo(
        () => PROVIDER_REGISTRY[settings.provider].models,
        [settings.provider],
    );

    const selectedModel = getModel(
        settings.provider,
        settings.models[P] ?? fallback,
    );
    const selectedCheckpoint = getCheckpoint(
        settings.provider,
        settings.models[P] ?? fallback,
    );
    const currentModel = { ...selectedModel, ...selectedCheckpoint };
    const supportedFeatures = {
        ...selectedModel?.supports,
        ...selectedCheckpoint?.supports,
    };

    console.log(currentModel);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Select Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex flex-row space-x-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="provider">Provider</Label>
                            <Select
                                value={settings.provider}
                                onValueChange={onProviderChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(MODEL_REGISTRY)
                                        .filter(([, models]) => models.length)
                                        .map(([provider]) => (
                                            <SelectItem
                                                key={provider}
                                                value={provider}
                                            >
                                                {
                                                    PROVIDER_REGISTRY[provider]
                                                        .name
                                                }
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {settings.provider && (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="model">Model</Label>
                                <Select
                                    disabled={!settings.provider}
                                    value={settings.models[P]}
                                    onValueChange={(m) => {
                                        const P = settings.provider;

                                        updateSettings({
                                            models: {
                                                ...settings.models,
                                                [P]: m,
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger id="model">
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[...providerModels]
                                            .reverse()
                                            .map((model) => (
                                                <SelectGroup key={model.id}>
                                                    <SelectLabel>
                                                        {model.name}
                                                    </SelectLabel>
                                                    {model.checkpoints ? (
                                                        model.checkpoints.map(
                                                            (c) => (
                                                                <SelectItem
                                                                    key={c.id}
                                                                    value={c.id}
                                                                >
                                                                    {c.id}
                                                                </SelectItem>
                                                            ),
                                                        )
                                                    ) : (
                                                        <SelectItem
                                                            key={model.id}
                                                            value={model.id}
                                                        >
                                                            {model.id}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    {settings.provider && (
                        <Password label="API Key" placeholder="API Key" />
                    )}
                </div>

                {currentModel && (
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-medium">
                                {currentModel.name}
                            </h3>
                            <h6 className="font-mono">{currentModel?.id}</h6>
                            <span className="text-sm text-muted-foreground mt-2">
                                {currentModel?.description}
                            </span>
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(8rem,100%),1fr))] gap-2">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Context Length
                                </p>
                                <p className="text-2xl font-bold">
                                    {formatNumber(currentModel.contextLength)}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    Maximum input tokens
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Max Output
                                </p>
                                <p className="text-2xl font-bold">
                                    {formatNumber(currentModel.maxOutputTokens)}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    Maximum output tokens
                                </span>
                            </div>

                            {currentModel?.price && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Price
                                        <span className="text-xs text-muted-foreground ml-2">
                                            Input • Output
                                        </span>
                                    </p>
                                    <p className="text-2xl font-bold">
                                        $
                                        {formatNumber(
                                            currentModel?.price?.input,
                                        )}{" "}
                                        • $
                                        {formatNumber(
                                            currentModel?.price?.output,
                                        )}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                        Per 1 million tokens
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Capabilities</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(supportedFeatures).map(
                                    ([key, supported]) => (
                                        <Badge
                                            key={key}
                                            variant={
                                                supported
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className={`gap-1 ${supported ? "" : "text-muted-foreground"}`}
                                        >
                                            {supported ? (
                                                <Check />
                                            ) : (
                                                <AlertCircle />
                                            )}
                                            {key
                                                .replace(/([A-Z])/g, " $1")
                                                .replace(/^./, (str) =>
                                                    str.toUpperCase(),
                                                )}
                                        </Badge>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
