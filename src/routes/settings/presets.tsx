import { PromptEditor } from "./components/presets/editor";
import { PromptList } from "./components/presets/list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileX2 } from "lucide-react";
import { useState } from "react";
import { useSettingsContext } from "@/contexts/settings-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useLoaderData, createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { db } from "@/database/database";

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
        <div className="h-full pb-2 overflow-hidden">
            <Card className="h-full pb-0 gap-0">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText />
                        Presets
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-full flex flex-row overflow-hidden">
                    <SidebarProvider className="min-h-0 gap-4">
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
        meta: [{ title: "Presets — Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Presets"
    }),
    loader: () => db.presets.orderBy("updatedAt").reverse().toArray()
});
