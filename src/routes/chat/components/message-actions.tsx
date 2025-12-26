import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { useCharacterContext } from "@/contexts/character-context";
import { useChatContext } from "@/contexts/chat-context";
import { Chat } from "@/database/schema/chat";
import { replaceMacros } from "@/lib/macros";
import { cn, generateCuid2 } from "@/lib/utils";
import { type Message } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, Pencil, RefreshCw, Split, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface MessageButton {
    Icon: React.ComponentType;
    tooltip: string;
    onClick?: () => void;
    className?: string;
}

interface Props {
    message: Message;
    index: number;
    editingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    editedContentState: [string, React.Dispatch<React.SetStateAction<string>>];
    className: string;
}

export function MessageActions({
    message,
    index,
    editingState,
    editedContentState,
    className
}: Props) {
    const { character, persona } = useCharacterContext();
    const { graphSync, chat } = useChatContext();
    const { messages, setMessages, regenerate, status } = useChat<Message>({
        chat
    });

    const navigate = useNavigate();

    const [editing, setEditing] = editingState;
    const [editedContent, setEditedContent] = editedContentState;

    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    const CopyCheck = useMemo(() => {
        return function CopyCheck({
            ...props
        }: React.ComponentProps<typeof Copy>) {
            const className = cn(
                props.className,
                copied ? "text-green-500" : ""
            );
            return copied ? (
                <Check {...props} className={className} />
            ) : (
                <Copy {...props} className={className} />
            );
        };
    }, [copied]);

    const regenerateMessage = useCallback(() => {
        if (message.role === "assistant") {
            setMessages((messages) => {
                const previousMessage = messages[index - 1];
                if (!previousMessage || previousMessage.role !== "user") {
                    return messages;
                }
                const vertex = graphSync.vertexMap.get(previousMessage.id);
                if (!vertex) return messages;
                graphSync.setBranchPoint(vertex);
                return messages.slice(0, index);
            });
        } else if (message.role === "user") {
            const vertex = graphSync.vertexMap.get(message.id);
            if (!vertex) return;
            graphSync.setBranchPoint(vertex);
            setMessages((messages) => messages.slice(0, index + 1));
        }
        regenerate();
    }, [message, setMessages, index, graphSync, regenerate]);

    const deleteMessage = useCallback(() => {
        const vertexID = graphSync.vertexMap.get(message.id);
        if (!vertexID) return;
        graphSync.deleteVertex(vertexID);
        setMessages((messages) => messages.slice(0, index - 1));
        toast.success("Message deleted.");
    }, [graphSync, message, setMessages, index]);

    const saveMessageEdit = useCallback(
        (shouldRegenerate: boolean) => {
            if (shouldRegenerate) {
                const oldContent = message.parts.find(
                    (part) => part.type === "text"
                )?.text;

                if (oldContent !== editedContent) {
                    const vertexID = graphSync.vertexMap.get(message.id);
                    if (!vertexID) return;
                    const vertex = graphSync.graph.getVertex(vertexID);
                    if (!vertex || !vertex.parent) return;

                    graphSync.setBranchPoint(vertex.parent);

                    setMessages((messages) => {
                        const newMessages: Message[] = [
                            ...messages.slice(0, index),
                            {
                                id: generateCuid2(),
                                role: "user",
                                parts: [
                                    {
                                        type: "text",
                                        text: replaceMacros(editedContent, {
                                            character,
                                            persona
                                        })
                                    }
                                ],
                                metadata: { createdAt: new Date() }
                            }
                        ];
                        graphSync.commit(newMessages);
                        return newMessages;
                    });

                    regenerate();
                }
            } else {
                setMessages((messages) => {
                    const oldContent = message.parts.find(
                        (part) => part.type === "text"
                    )?.text;

                    if (oldContent === editedContent) {
                        return messages;
                    }

                    const parts = messages[index].parts.map((part) =>
                        part.type === "text"
                            ? {
                                  ...part,
                                  text: replaceMacros(editedContent, {
                                      character,
                                      persona
                                  })
                              }
                            : part
                    );

                    messages[index] = {
                        ...message,
                        parts,
                        metadata: {
                            ...message.metadata,
                            updatedAt: new Date()
                        }
                    };

                    graphSync.updateMessage(messages[index]);

                    return messages;
                });
            }
            setEditing(false);
            toast.success("Message updated.");
        },
        [
            message,
            graphSync,
            setMessages,
            index,
            editedContent,
            regenerate,
            setEditing,
            character,
            persona
        ]
    );

    const forkChat = useCallback(async () => {
        const isLastMessage = messages.length === index + 1;
        const next = isLastMessage
            ? undefined
            : graphSync.vertexMap.get(messages[index + 1].id);
        const id = await Chat.fork(
            graphSync.graph,
            graphSync.characterIDs,
            graphSync.title,
            next
        );
        navigate({ to: "/chat/$id", params: { id } });
    }, [graphSync, messages, index, navigate]);

    const copyMessage = useCallback(async () => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        }
    }, [message.parts]);

    const editMessage = useCallback(() => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            setEditing(true);
            setEditedContent(messageContent);
        }
    }, [setEditing, setEditedContent, message.parts]);

    const cancelMessageEdit = useCallback(() => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            setEditing(false);
            setEditedContent(messageContent);
        }
    }, [setEditing, setEditedContent, message.parts]);

    const buttonData = useMemo(() => {
        const buttons: MessageButton[] = [];

        if (editing) {
            if (message.role === "user") {
                buttons.push({
                    Icon: RefreshCw,
                    tooltip: "Save & Regenerate",
                    onClick: () => saveMessageEdit(true),
                    className: "text-blue-500 hover:text-blue-500"
                });
            }
            buttons.push({
                Icon: Check,
                tooltip: "Save",
                onClick: () => saveMessageEdit(false),
                className: "text-green-500 hover:text-green-500"
            });
            buttons.push({
                Icon: X,
                tooltip: "Cancel",
                onClick: cancelMessageEdit,
                className: "text-destructive hover:text-destructive"
            });
            return buttons;
        }

        if (
            message.role === "assistant" ||
            (message.role === "user" && index === messages.length - 1)
        ) {
            buttons.push({
                Icon: RefreshCw,
                tooltip: "Regenerate",
                onClick: regenerateMessage
            });
        }

        buttons.push({
            Icon: Split,
            tooltip: "Fork",
            onClick: forkChat
        });
        buttons.push({
            Icon: CopyCheck,
            tooltip: copied ? "Copied!" : "Copy",
            onClick: copyMessage
        });
        buttons.push({
            Icon: Pencil,
            tooltip: "Edit",
            onClick: editMessage
        });
        buttons.push({
            Icon: Trash2,
            tooltip: "Delete",
            onClick: deleteMessage,
            className: "text-destructive hover:text-destructive"
        });

        return buttons;
    }, [
        editing,
        saveMessageEdit,
        cancelMessageEdit,
        message,
        index,
        messages,
        regenerateMessage,
        forkChat,
        CopyCheck,
        copied,
        copyMessage,
        editMessage,
        deleteMessage
    ]);

    const buttons = buttonData.map((button, index) => (
        <Tooltip key={index}>
            <TooltipTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    disabled={status !== "ready"}
                    className={cn(button.className, className)}
                    onClick={button.onClick}
                >
                    <button.Icon />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{button.tooltip}</TooltipContent>
        </Tooltip>
    ));

    return <ButtonGroup>{buttons}</ButtonGroup>;
}
