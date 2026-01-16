import { Card, CardContent } from "@/components/ui/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSettingsContext } from "@/contexts/settings";
import { db } from "@/database/monogatari-db";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FileX2 } from "lucide-react";
import { useState } from "react";
import { PromptEditor } from "./components/presets/editor";
import { PromptList } from "./components/presets/list";

function EmptyPreset() {
    return (
        <Empty className="border border-dashed my-6">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileX2 />
                </EmptyMedia>
                <EmptyTitle>No Presets</EmptyTitle>
                <EmptyDescription>
                    Click "New Preset" to get started.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function PresetSettings() {
    const { settings, updateSettings } = useSettingsContext();

    const loadedPresets = useLoaderData({ from: "/settings/presets" });
    const presets = useLiveQuery(
        () => db.presets.orderBy("updatedAt").reverse().toArray(),
        [],
        loadedPresets
    );

    const selectedPreset = presets.find(
        (preset) => preset.id === settings.preset
    );

    const updateSelectedPreset = (presetID: string) => {
        updateSettings({ preset: presetID });
    };

    const [promptIndex, setPromptIndex] = useState(0);

    return (
        <div className="h-full pb-2 sm:overflow-hidden">
            <Card className="sm:h-full py-0 gap-0 overflow-hidden">
                <CardContent className="h-full flex flex-col sm:flex-row sm:overflow-hidden">
                    <SidebarProvider className="min-h-0 max-sm:flex-col gap-4">
                        <PromptList
                            presets={presets}
                            selectedPreset={selectedPreset}
                            updateSelectedPreset={updateSelectedPreset}
                            promptState={[promptIndex, setPromptIndex]}
                        />
                        {selectedPreset ? (
                            <PromptEditor
                                selectedPreset={selectedPreset}
                                updateSelectedPreset={updateSelectedPreset}
                                promptIndex={promptIndex}
                            />
                        ) : (
                            <EmptyPreset />
                        )}
                    </SidebarProvider>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute("/settings/presets")({
    component: PresetSettings,
    head: () => ({
        meta: [{ title: "Presets - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Presets"
    }),
    loader: () => db.presets.orderBy("updatedAt").reverse().toArray()
});
