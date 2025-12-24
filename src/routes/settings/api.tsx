import Parameters from "./components/api/parameters";
import { ProxySettings } from "./components/api/proxy-settings";
import SelectModel from "./components/api/select-model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsContext } from "@/contexts/settings-context";
import { getModel } from "@/types/registry";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronsLeftRightEllipsis, Image, Text } from "lucide-react";

function ApiSettings() {
    const { settings } = useSettingsContext();

    const selectedModel = getModel(
        settings.provider,
        settings.models[settings.provider] as string
    );

    return (
        <div className="space-y-4 pb-2">
            <Tabs defaultValue="text" className="w-full">
                <TabsList className="hidden w-full grid-cols-3">
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
                    {settings.provider !== "openrouter" && <ProxySettings />}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export const Route = createFileRoute("/settings/api")({
    component: ApiSettings,
    head: () => ({
        meta: [{ title: "API — Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "API"
    })
});
