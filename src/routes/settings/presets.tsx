import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/database/monogatari-db";
import { Preset } from "@/database/schema/preset";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useSettings } from "@/hooks/use-settings";
import { PromptEditor } from "@/routes/settings/components/presets/editor";
import { PromptList } from "@/routes/settings/components/presets/list";
import {
    createFileRoute,
    stripSearchParams,
    useLoaderData,
    useNavigate,
    useSearch
} from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FileInputIcon, FilePlus2Icon, FileX2Icon } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

function EmptyPreset() {
    return (
        <Empty className="my-6 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileX2Icon />
                </EmptyMedia>
                <EmptyTitle>No Presets</EmptyTitle>
                <EmptyDescription>Click "New Preset" to get started.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function PresetSettings() {
    const { settings, updateSettings } = useSettings();

    const loadedPresets = useLoaderData({ from: "/settings/presets" });
    const presets = useLiveQuery(
        () => db.presets.orderBy("updatedAt").reverse().toArray(),
        [],
        loadedPresets
    );

    const { index } = useSearch({ from: "/settings/presets" });
    const navigate = useNavigate({ from: "/settings/presets" });

    const updateIndex = (index: number) => {
        void navigate({
            search: { index },
            replace: true
        });
    };

    const selectedPreset = presets.find((preset) => preset.id === settings.preset);
    const updateSelectedPreset = (presetID: string) => {
        updateSettings((settings) => {
            settings.preset = presetID;
        });
        updateIndex(0);
    };

    const createNewPreset = async () => {
        const preset = new Preset();
        await preset.save();
        updateSelectedPreset(preset.id);
    };

    const { input, browse } = useFileDialog({
        accept: "application/json",
        onChange: async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            toast.promise(Preset.import(file), {
                loading: "Importing preset...",
                success: (preset: Preset) => {
                    updateSelectedPreset(preset.id);
                    return "Preset imported successfully!";
                },
                error: (error: Error) => {
                    console.error("Preset import failed:", error);
                    return "Failed to import preset. Is it valid JSON?";
                }
            });
        }
    });

    return (
        <>
            <Header className="justify-between">
                <ButtonGroup>
                    <Button variant="outline" onClick={browse}>
                        {input}
                        <FileInputIcon />
                        Import
                    </Button>
                    <Button variant="outline" onClick={createNewPreset}>
                        <FilePlus2Icon />
                        New
                    </Button>
                </ButtonGroup>
            </Header>
            <div className="h-full pb-2 sm:overflow-hidden">
                <Card className="gap-0 overflow-hidden py-0 sm:h-full">
                    <CardContent className="flex h-full flex-col sm:flex-row sm:overflow-hidden">
                        <SidebarProvider className="min-h-0 gap-4 max-sm:flex-col">
                            <PromptList
                                presets={presets}
                                selectedPreset={selectedPreset}
                                updateSelectedPreset={updateSelectedPreset}
                                promptIndex={index}
                                setPromptIndex={updateIndex}
                            />
                            {selectedPreset ? (
                                <PromptEditor selectedPreset={selectedPreset} promptIndex={index} />
                            ) : (
                                <EmptyPreset />
                            )}
                        </SidebarProvider>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export const Route = createFileRoute("/settings/presets")({
    component: PresetSettings,
    validateSearch: z.object({
        index: z.int().gte(0).default(0)
    }),
    head: () => ({
        meta: [{ title: "Presets - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Presets"
    }),
    loader: () => db.presets.orderBy("updatedAt").reverse().toArray(),
    search: {
        middlewares: [
            stripSearchParams({
                index: 0
            })
        ]
    }
});
