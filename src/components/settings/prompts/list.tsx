import React, { useEffect, useRef, useState } from "react";
import { PromptManager } from "@/database/prompts";
import type { PromptSet } from "@/database/schema/prompt-set";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Upload,
    Trash2,
    FileText,
    MessageSquare,
    MoreVertical
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Props {
    onSelect: (id: string | null) => void;
}

export function PromptList({ onSelect }: Props) {
    const [sets, setSets] = useState<PromptSet[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const reload = () => PromptManager.list().then(setSets);

    useEffect(() => {
        reload();
    }, []);

    const handleSelect = (id: string | null) => {
        setSelectedId(id);
        onSelect(id);
    };

    const handleDelete = async (id: string, event?: React.MouseEvent) => {
        event?.stopPropagation();

        if (!confirm("Are you sure you want to delete this prompt set?")) {
            return;
        }

        try {
            await PromptManager.delete(id);
            setSets((s) => s.filter((ps) => ps.id !== id));

            // If the deleted item was selected, clear selection
            if (selectedId === id) {
                handleSelect(null);
            }

            toast.success("Prompt set deleted successfully");
        } catch (error) {
            console.error("Failed to delete prompt set:", error);
            toast.error("Failed to delete prompt set");
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = async (
        e
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const converted = PromptManager.fromSilly(parsed);
            await PromptManager.save(converted);
            reload();
            toast.success("Prompt set imported successfully");
        } catch (err) {
            console.error("Import failed:", err);
            toast.error(
                "Unable to import that file. Is it valid SillyTavern JSON?"
            );
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
                <Button
                    onClick={() => handleSelect(null)}
                    className="w-full gap-2 rounded-full"
                >
                    <Plus />
                    New Prompt Set
                </Button>
                <Button
                    onClick={handleImportClick}
                    variant="outline"
                    className="w-full gap-2 rounded-full"
                >
                    <Upload />
                    Import from SillyTavern
                </Button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleFileChosen}
            />

            <Separator />

            {/* Prompt Sets List */}
            <div className="space-y-2">
                {sets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No prompt sets yet</p>
                        <p className="text-xs">Create one to get started</p>
                    </div>
                ) : (
                    sets.map((set) => (
                        <Card
                            key={set.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedId === set.id
                                    ? "ring-2 ring-primary bg-primary/5"
                                    : "hover:bg-muted/50"
                            }`}
                            onClick={() => handleSelect(set.id)}
                        >
                            <CardContent>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium truncate">
                                                {set.name || "Untitled"}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs flex items-center gap-1 shrink-0"
                                            >
                                                <MessageSquare className="h-3 w-3" />
                                                {set.messages?.length || 0}
                                            </Badge>
                                        </div>

                                        {set.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {set.description}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => handleDelete(set.id, e)}
                                        className="text-destructive rounded-full"
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
