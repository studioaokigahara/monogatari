import {
    Select,
    SelectContent,
    SelectGroup,
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
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { Preset, Prompt } from "@/database/schema/preset";
import { cn, downloadFile, generateCuid2 } from "@/lib/utils";
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
import { FileOutputIcon, ListPlusIcon, Trash2Icon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface SortablePromptProps {
    prompt: Prompt;
    isActive: boolean;
    onButtonClick: () => void;
    onActionClick: () => void;
}

function SortablePrompt({ prompt, isActive, onButtonClick, onActionClick }: SortablePromptProps) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: prompt.id
    });

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
                onClick={onButtonClick}
            >
                <span className={cn("truncate", !prompt.enabled ? "max-w-[19ch]" : "")}>
                    {prompt.name}
                </span>
                {!prompt.enabled && (
                    <SidebarMenuBadge className="ml-2 rounded bg-destructive/20 px-1 py-0.5 text-destructive">
                        Disabled
                    </SidebarMenuBadge>
                )}
            </SidebarMenuButton>
            <SidebarMenuAction showOnHover onClick={onActionClick}>
                <Trash2Icon className="text-destructive/90 hover:text-destructive" />
            </SidebarMenuAction>
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
                <span className={cn("truncate", !prompt.enabled ? "max-w-[19ch]" : "")}>
                    {prompt.name}
                </span>
                {!prompt.enabled && (
                    <SidebarMenuBadge className="ml-2 rounded bg-destructive/20 px-1 py-0.5 text-destructive">
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
    promptIndex: number;
    setPromptIndex: (index: number) => void;
}

export function PromptList({
    presets,
    selectedPreset,
    updateSelectedPreset,
    promptIndex,
    setPromptIndex
}: Props) {
    const [prompts, setPrompts] = useState(selectedPreset?.prompts);
    useEffect(() => setPrompts(selectedPreset?.prompts), [selectedPreset]);

    const [activeID, setActiveID] = useState("");
    const activePrompt = prompts?.find((prompt) => prompt.id === activeID);

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

        const selectedPrompt = oldPrompts[promptIndex]?.id;
        if (selectedPrompt) {
            const newPromptIndex = newPrompts.findIndex((prompt) => prompt.id === selectedPrompt);
            if (newPromptIndex >= 0) setPromptIndex(newPromptIndex);
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
                if (oldPromptIndex >= 0) setPromptIndex(oldPromptIndex);
            }
            console.error("Failed to save prompt order:", error);
            toast.error("Failed to save prompt order");
        }
    };

    const presetItems = presets.map((preset) => ({ value: preset.id, label: preset.name }));
    const selectItems = presetItems.map((item) => (
        <SelectItem key={item.value} value={item.value}>
            {item.label}
        </SelectItem>
    ));

    const addPrompt = async () => {
        const newPrompt: Prompt = {
            id: generateCuid2(),
            name: "New Prompt",
            role: "system",
            content: "",
            enabled: true,
            position: "before",
            depth: 0
        };
        await selectedPreset?.update({ prompts: [...selectedPreset.prompts, newPrompt] });
        setPromptIndex(Math.max(0, (selectedPreset?.prompts.length ?? 1) - 1));
    };

    const deletePrompt = async (index: number) => {
        await selectedPreset?.update({
            prompts: selectedPreset.prompts.toSpliced(index, 1)
        });
        setPromptIndex(Math.max(0, index - 1));
    };

    const exportPreset = () => {
        const preset = selectedPreset?.serialize();
        const json = JSON.stringify(preset);
        const file = new File([json], `${preset?.name}.json`, {
            type: "application/json"
        });
        downloadFile(file);
    };

    const deletePreset = async () => {
        await selectedPreset?.delete();
        updateSelectedPreset(presets[presets.length - 1].id);
    };

    return (
        <Sidebar collapsible="none" className="w-full sm:w-(--sidebar-width)">
            <SidebarHeader className="pt-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Select
                            items={presetItems}
                            value={selectedPreset?.id}
                            onValueChange={(value) => updateSelectedPreset(value as string)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>{selectItems}</SelectGroup>
                            </SelectContent>
                        </Select>
                    </SidebarMenuItem>
                    {selectedPreset && (
                        <>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={exportPreset}>
                                    <FileOutputIcon />
                                    Export Preset
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={deletePreset}
                                    className="hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40"
                                >
                                    <Trash2Icon className="text-destructive" />
                                    Delete Preset
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </>
                    )}
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator className="mx-0" />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {selectedPreset && (
                                <>
                                    <SidebarMenuItem className="sticky top-0 z-1 -mt-2 rounded-none bg-card pt-2">
                                        <SidebarMenuButton onClick={addPrompt}>
                                            <ListPlusIcon />
                                            Add Prompt
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </>
                            )}
                            {selectedPreset && prompts && (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={prompts.map((prompt) => prompt.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {prompts.map((prompt, index) => (
                                            <SortablePrompt
                                                key={prompt.id}
                                                prompt={prompt}
                                                isActive={index === promptIndex}
                                                onButtonClick={() => setPromptIndex(index)}
                                                onActionClick={() => deletePrompt(index)}
                                            />
                                        ))}
                                    </SortableContext>
                                    <DragOverlay>
                                        {activePrompt && (
                                            <DraggablePrompt
                                                prompt={activePrompt}
                                                isActive={
                                                    prompts.findIndex(
                                                        (prompt) => prompt.id === activePrompt.id
                                                    ) === promptIndex
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
