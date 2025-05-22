import Parameters from "@/components/settings/parameters";
import { ProxySettings } from "@/components/settings/proxy-settings";
import SelectModel from "@/components/settings/select-model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsContext } from "@/contexts/settings-context";
import { Providers } from "@/types/models";
import {
    MODEL_REGISTRY,
    PROVIDER_REGISTRY,
    getCheckpoint,
    getModel,
} from "@/types/registry";
import { Settings } from "@/types/settings";
import {
    AlertCircle,
    Brackets,
    Check,
    ChevronsLeftRightEllipsis,
    Image,
    Info,
    Text,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ApiSettings() {
    const { settings, updateSettings } = useSettingsContext();

    const selectedModel = getModel(
        settings.provider,
        settings.models[settings.provider],
    );

    useEffect(() => {
        if (
            selectedModel &&
            settings.maxOutputTokens > selectedModel.maxOutputTokens
        ) {
            updateSettings({
                maxOutputTokens: selectedModel.maxOutputTokens,
            });
        }
        if (settings.provider !== "openai" && settings.temperature > 1) {
            updateSettings({
                temperature: 1,
            });
        }
    }, [selectedModel]);

    return (
        <>
            <div className="space-y-4 pb-4">
                <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="text">
                            <Text />
                            Text
                        </TabsTrigger>
                        <TabsTrigger value="image">
                            <Image />
                            Image
                        </TabsTrigger>
                        <TabsTrigger value="embedding">
                            <ChevronsLeftRightEllipsis />
                            Embedding
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="text"
                        className="grid grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))] gap-4"
                    >
                        <SelectModel />
                        {selectedModel && <Parameters />}
                        <ProxySettings />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
