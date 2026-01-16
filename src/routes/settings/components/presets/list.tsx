import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { Preset, Prompt } from "@/database/schema/preset";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { cn } from "@/lib/utils";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileInput, FilePlus2 } from "lucide-react";
import React, { SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";

interface SortablePromptProps {
    prompt: Prompt;
    index: number;
    isActive: boolean;
    onSelect: (index: number) => void;
}

function SortablePrompt({
    prompt,
    index,
    isActive,
    onSelect
}: SortablePromptProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({ id: prompt.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1
    };

    return (
        <SidebarMenuItem
            key={prompt.id}
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
        >
            <SidebarMenuButton
                isActive={isActive}
                className="cursor-grab active:cursor-grabbing"
                onClick={() => onSelect(index)}
            >
                <span
                    className={cn(
                        "truncate",
                        !prompt.enabled ? "max-w-[19ch]" : ""
                    )}
                >
                    {prompt.name}
                </span>
                {!prompt.enabled && (
                    <SidebarMenuBadge className="bg-destructive/20 text-destructive px-1 py-0.5 ml-2 rounded">
                        Disabled
                    </SidebarMenuBadge>
                )}
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

interface DraggablePromptProps {
    prompt: Prompt;
    isActive: boolean;
}

function DraggablePrompt({ prompt, isActive }: DraggablePromptProps) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton isActive={isActive} className="cursor-grabbing">
                <span
                    className={cn(
                        "truncate",
                        !prompt.enabled ? "max-w-[19ch]" : ""
                    )}
                >
                    {prompt.name}
                </span>
                {!prompt.enabled && (
                    <SidebarMenuBadge className="bg-destructive/20 text-destructive px-1 py-0.5 ml-2 rounded">
                        Disabled
                    </SidebarMenuBadge>
                )}
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

interface Props {
    presets: Preset[];
    selectedPreset?: Preset;
    updateSelectedPreset: (id: string) => void;
    promptState: [number, React.Dispatch<SetStateAction<number>>];
}

export function PromptList({
    presets,
    selectedPreset,
    updateSelectedPreset,
    promptState
}: Props) {
    const [selectedPromptIndex, setSelectedPromptIndex] = promptState;

    const [prompts, setPrompts] = useState(selectedPreset?.prompts);
    useEffect(() => setPrompts(selectedPreset?.prompts), [selectedPreset]);

    const [activeID, setActiveID] = useState("");
    const activePrompt = prompts?.find((prompt) => prompt.id === activeID);

    const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = async (
        e
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await Preset.import(file).catch((error: Error) => {
            console.error("Import failed:", error);
            toast.error(
                "Unable to import that file. Is it valid SillyTavern JSON?",
                {
                    description: error.message
                }
            );
        });

        toast.success("Preset imported successfully!");
    };

    const { input, browse } = useFileDialog({
        accept: "application/json",
        onChange: handleFileChosen
    });

    const createNewPreset = async () => {
        const preset = new Preset();
        await preset.save();
        updateSelectedPreset(preset.id);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 }
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveID(String(event.active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!selectedPreset || !prompts) return;
        setActiveID("");

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = prompts.findIndex((prompt) => prompt.id === active.id);
        const newIndex = prompts.findIndex((prompt) => prompt.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const oldPrompts = prompts;
        const newPrompts = arrayMove(oldPrompts, oldIndex, newIndex);

        setPrompts(newPrompts);

        const selectedPrompt = oldPrompts[selectedPromptIndex]?.id;
        if (selectedPrompt) {
            const newPromptIndex = newPrompts.findIndex(
                (prompt) => prompt.id === selectedPrompt
            );
            if (newPromptIndex >= 0) setSelectedPromptIndex(newPromptIndex);
        }

        try {
            await selectedPreset.update({
                prompts: newPrompts
            });
            updateSelectedPreset(selectedPreset.id);
        } catch (error) {
            setPrompts(oldPrompts);
            if (selectedPrompt) {
                const oldPromptIndex = oldPrompts.findIndex(
                    (prompt) => prompt.id === selectedPrompt
                );
                if (oldPromptIndex >= 0) setSelectedPromptIndex(oldPromptIndex);
            }
            console.error("Failed to save prompt order:", error);
            toast.error("Failed to save prompt order");
        }
    };

    return (
        <Sidebar collapsible="none" className="w-full sm:w-(--sidebar-width)">
            <SidebarHeader className="pt-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={createNewPreset}>
                            <FilePlus2 />
                            New Preset
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={browse}>
                            {input}
                            <FileInput />
                            Import from SillyTavern
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Select
                            value={selectedPreset?.id}
                            onValueChange={(value) =>
                                updateSelectedPreset(value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {presets.map((preset) => (
                                    <SelectItem
                                        key={preset.id}
                                        value={preset.id}
                                    >
                                        <span>{preset.name || "Untitled"}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator className="mx-0" />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {selectedPreset && prompts && (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={prompts.map(
                                            (prompt) => prompt.id
                                        )}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {prompts.map((prompt, index) => (
                                            <SortablePrompt
                                                key={prompt.id}
                                                prompt={prompt}
                                                index={index}
                                                isActive={
                                                    index ===
                                                    selectedPromptIndex
                                                }
                                                onSelect={
                                                    setSelectedPromptIndex
                                                }
                                            />
                                        ))}
                                    </SortableContext>
                                    <DragOverlay>
                                        {activePrompt && (
                                            <DraggablePrompt
                                                prompt={activePrompt}
                                                isActive={
                                                    prompts.findIndex(
                                                        (prompt) =>
                                                            prompt.id ===
                                                            activePrompt.id
                                                    ) === selectedPromptIndex
                                                }
                                            />
                                        )}
                                    </DragOverlay>
                                </DndContext>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
