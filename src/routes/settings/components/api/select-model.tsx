import { Markdown } from "@/components/markdown";
import Password from "@/components/password-input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Anthropic } from "@/components/ui/icon/anthropic";
import { DeepSeek } from "@/components/ui/icon/deepseek";
import { Google } from "@/components/ui/icon/google";
import { OpenAI } from "@/components/ui/icon/openai";
import { OpenRouter } from "@/components/ui/icon/openrouter";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useSettingsContext } from "@/contexts/settings";
import { OpenRouterRegistry } from "@/lib/openrouter";
import { Modality } from "@/types/models";
import { PROVIDER_REGISTRY, getModel } from "@/types/registry";
import { Settings } from "@/types/settings";
import {
    AlertCircle,
    BrainCircuit,
    Check,
    FileImage,
    FileText,
    FileType,
    FileVideo,
    FileVolume2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatNumber(number: number) {
    if (isNaN(number)) return "?";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const mapModality = (modality: Modality) => {
    switch (modality) {
        case "text":
            return <FileText />;
        case "image":
            return <FileImage />;
        case "audio":
            return <FileVolume2 />;
        case "video":
            return <FileVideo />;
        case "pdf":
            return <FileType />;
    }
};

const getIcon = (provider: Settings["provider"]) => {
    switch (provider) {
        case "openai":
            return <OpenAI />;
        case "anthropic":
            return <Anthropic />;
        case "google":
            return <Google />;
        case "deepseek":
            return <DeepSeek />;
        case "openrouter":
            return <OpenRouter />;
    }
};

const getApiKeyPlaceholder = (provider: Settings["provider"]) => {
    switch (provider) {
        case "openai":
        case "deepseek":
            return "sk-" + "x".repeat(48);
        case "anthropic":
            return "sk-ant-api03-" + "x".repeat(45);
        case "google":
            return "AlaSy...";
        case "openrouter":
            return "sk-or-v1-" + "x".repeat(64);
    }
};

export default function SelectModel() {
    const { settings, updateSettings } = useSettingsContext();

    const [open, setOpen] = useState(false);

    const P = settings.provider as Settings["provider"];
    const fallback =
        PROVIDER_REGISTRY[P].models[0]?.checkpoints?.[0]?.id ??
        PROVIDER_REGISTRY[P].models[0]?.id ??
        "";

    useEffect(() => {
        if (!settings.models[P]) {
            const registry = PROVIDER_REGISTRY[P].models;
            const fallback = registry[0]?.checkpoints?.[0]?.id ?? registry[0]?.id ?? "";
            updateSettings({
                models: { ...settings.models, [P]: fallback }
            });
        }
    }, [settings.models, P, updateSettings]);

    const onProviderChange = (provider: Settings["provider"]) => {
        updateSettings({ provider });
    };

    const providerModels = PROVIDER_REGISTRY[settings.provider].models;

    const currentModel = getModel(settings.provider, (settings.models[P] as string) ?? fallback);
    const supportedFeatures = currentModel?.supports ?? {};

    const openRouterModels = useMemo(() => {
        const models = PROVIDER_REGISTRY.openrouter.models;
        const grouped: Record<string, typeof models> = {};

        models.forEach((model) => {
            const provider = OpenRouterRegistry.getProviderName(model.id);
            if (!grouped[provider]) grouped[provider] = [];
            grouped[provider].push(model);
        });

        Object.keys(grouped).forEach((provider) =>
            grouped[provider].sort((a, b) => a.name.localeCompare(b.name))
        );

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, []);

    const selectProvider = Object.entries(PROVIDER_REGISTRY).map(([providerID, provider]) => (
        <SelectItem key={providerID} value={providerID}>
            {getIcon(providerID as Settings["provider"])}
            {provider.name}
        </SelectItem>
    ));

    const selectModelOpenRouter = openRouterModels.map(([providerName, models]) => (
        <SelectGroup key={providerName}>
            <SelectLabel>{providerName}</SelectLabel>
            {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                    {model.name.split(":")[1] ?? model.name}
                </SelectItem>
            ))}
        </SelectGroup>
    ));

    const selectModel = [...providerModels].reverse().map((model) => (
        <SelectGroup key={model.id}>
            <SelectLabel>{model.name}</SelectLabel>
            {model.checkpoints ? (
                model.checkpoints.map((c) => (
                    <SelectItem key={c.id} value={c.id as string}>
                        {c.id}
                    </SelectItem>
                ))
            ) : (
                <SelectItem key={model.id} value={model.id}>
                    {model.id}
                </SelectItem>
            )}
        </SelectGroup>
    ));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit />
                    Model
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="provider">Provider</Label>
                            <Select value={settings.provider} onValueChange={onProviderChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a provider" />
                                </SelectTrigger>
                                <SelectContent>{selectProvider}</SelectContent>
                            </Select>
                        </div>

                        {settings.provider && (
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="model">Model</Label>
                                <Select
                                    open={open}
                                    onOpenChange={(open) => setOpen(open)}
                                    disabled={!settings.provider}
                                    value={settings.models[P] as string}
                                    onValueChange={(m) => {
                                        const P = settings.provider;

                                        updateSettings({
                                            models: {
                                                ...settings.models,
                                                [P]: m
                                            }
                                        });
                                    }}
                                >
                                    <SelectTrigger id="model">
                                        <span className="pointer-events-none">
                                            {(settings.models[P] as string) || "Select a model..."}
                                        </span>
                                    </SelectTrigger>
                                    {open && (
                                        <SelectContent>
                                            {settings.provider === "openrouter"
                                                ? selectModelOpenRouter
                                                : selectModel}
                                        </SelectContent>
                                    )}
                                </Select>
                            </div>
                        )}
                    </div>
                    {settings.provider && (
                        <Password
                            label="API Key"
                            placeholder={getApiKeyPlaceholder(P)}
                            value={settings.apiKeys[settings.provider] ?? ""}
                            onChange={(e) => {
                                updateSettings({
                                    apiKeys: {
                                        ...settings.apiKeys,
                                        [settings.provider]: e.target.value
                                    }
                                });
                            }}
                        />
                    )}
                </div>

                {currentModel && (
                    <div className="mt-6 space-y-4">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="model">
                                <AccordionTrigger className="items-center [&>svg]:size-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-medium">{currentModel.name}</h3>
                                        <h6 className="font-mono">{currentModel?.id}</h6>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Markdown className="text-sm text-muted-foreground mt-2">
                                        {currentModel?.description || ""}
                                    </Markdown>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <div className="flex flex-row gap-8">
                            {currentModel.knowledgeCutoff && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Knowledge Cutoff</p>
                                    <p className="text-2xl font-bold">
                                        {currentModel.knowledgeCutoff.toLocaleString("default", {
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </p>
                                    {/*<span className="text-xs text-muted-foreground">
                                    Maximum input tokens
                                </span>*/}
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Modalities
                                    <span className="text-xs text-muted-foreground ml-2">
                                        Input • Output
                                    </span>
                                </p>
                                <div className="flex gap-6">
                                    <div>
                                        <div className="flex flex-row">
                                            {currentModel.modalities?.input.map((modality) =>
                                                mapModality(modality)
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {currentModel.modalities?.input
                                                .map((modality) =>
                                                    modality === "pdf"
                                                        ? "PDF"
                                                        : modality.replace(/^./, (str) =>
                                                              str.toUpperCase()
                                                          )
                                                )
                                                .join(", ")}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex flex-row">
                                            {currentModel.modalities?.output.map((modality) =>
                                                mapModality(modality)
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {currentModel.modalities?.output
                                                .map((modality) =>
                                                    modality === "pdf"
                                                        ? "PDF"
                                                        : modality.replace(/^./, (str) =>
                                                              str.toUpperCase()
                                                          )
                                                )
                                                .join(", ")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between gap-2">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Context Length</span>
                                <span className="text-2xl font-bold">
                                    {formatNumber(currentModel.contextLength)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Maximum input tokens
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Output Length</span>
                                <span className="text-2xl font-bold">
                                    {formatNumber(currentModel.maxOutputTokens)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Maximum output tokens
                                </span>
                            </div>
                            {currentModel?.price && (
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                        Price
                                        <span className="text-xs text-muted-foreground ml-2">
                                            Input • Output
                                        </span>
                                    </span>
                                    <span className="text-2xl font-bold">
                                        ${formatNumber(currentModel?.price?.input)} • $
                                        {formatNumber(currentModel?.price?.output)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Per 1 million tokens
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Capabilities</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(supportedFeatures).map(([key, supported]) => (
                                    <Badge
                                        key={key}
                                        variant={supported ? "default" : "outline"}
                                        className={`gap-1 ${supported ? "" : "text-muted-foreground"}`}
                                    >
                                        {supported ? <Check /> : <AlertCircle />}
                                        {key
                                            .replace(/([A-Z])/g, " $1")
                                            .replace(/^./, (str) => str.toUpperCase())}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
