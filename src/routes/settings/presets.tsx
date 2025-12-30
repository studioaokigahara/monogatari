import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/database/monogatari-db";
import { useSettingsContext } from "@/hooks/use-settings-context";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, FileX2 } from "lucide-react";
import { useState } from "react";
import { PromptEditor } from "./components/presets/editor";
import { PromptList } from "./components/presets/list";

function EmptyPreset() {
    return (
        <Empty className="mb-2 border border-dashed">
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
            <Card className="h-full pb-0 gap-0 overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText />
                        Presets
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-full flex flex-row sm:overflow-hidden">
                    <SidebarProvider className="min-h-0 flex-col sm:flex-row gap-4">
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
