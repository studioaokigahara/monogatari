import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { Chat } from "@/database/schema/chat";
import { useCharacterContext } from "@/hooks/use-character-context";
import { useChatContext } from "@/hooks/use-chat-context";
import { replaceMacros } from "@/lib/macros";
import { cn, generateCuid2 } from "@/lib/utils";
import { type Message } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, Pencil, RefreshCw, Split, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface MessageButton {
    Icon: React.ComponentType;
    tooltip: string;
    disabled: boolean;
    onClick?: () => void;
    className?: string;
}

function MessageButton({
    Icon,
    tooltip,
    onClick,
    disabled,
    className
}: MessageButton) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    className={className}
                    onClick={onClick}
                >
                    <Icon />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
    );
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

    const regenerateMessage = () => {
        const vertex =
            message.role === "user"
                ? graphSync.vertexMap.get(message.id)
                : index === 0
                  ? graphSync.graph.id
                  : graphSync.vertexMap.get(messages[index - 1].id);

        if (!vertex) {
            toast.error("Failed to find message ID in vertex map");
            return;
        }

        graphSync.setBranchPoint(vertex);
        void regenerate({ messageId: message.id });
    };

    const deleteMessage = async () => {
        const vertexID = graphSync.vertexMap.get(message.id);
        if (!vertexID) return;
        await graphSync.deleteVertex(vertexID);
        setMessages((messages) => messages.slice(0, index - 1));
        toast.success("Message deleted.");
    };

    const forkChat = async () => {
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
        void navigate({ to: "/chat/$id", params: { id } });
    };

    const copyMessage = async () => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        }
    };

    const editMessage = () => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            setEditing(true);
            setEditedContent(messageContent);
        }
    };

    const saveMessageEditAndRegenerate = () => {
        const oldContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;

        if (editedContent === oldContent) {
            setEditing(false);
            return;
        }

        const vertexID = graphSync.vertexMap.get(message.id);
        if (!vertexID) return;

        const vertex = graphSync.graph.getVertex(vertexID);
        if (!vertex || !vertex.parent) return;

        graphSync.setBranchPoint(vertex.parent);

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

        graphSync.commit(newMessages).catch((error: Error) => {
            toast.error("Failed to update message", {
                description: error.message
            });
        });

        setMessages(newMessages);
        setEditing(false);
        void regenerate();

        toast.success(
            "Message updated. Regenerating last assistant message..."
        );
    };

    const saveMessageEdit = () => {
        const oldContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;

        if (editedContent === oldContent) {
            setEditing(false);
            return;
        }

        const newParts = message.parts.map((part) =>
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

        const editedMessage = {
            ...message,
            parts: newParts,
            metadata: {
                ...message.metadata,
                updatedAt: new Date()
            }
        };

        graphSync.updateMessage(editedMessage).catch((error: Error) => {
            toast.error("Failed to update message", {
                description: error.message
            });
        });

        const newMessages = messages.toSpliced(index, 1, editedMessage);

        setMessages(newMessages);
        setEditing(false);
        toast.success("Message updated.");
    };

    const cancelMessageEdit = () => {
        const messageContent = message.parts.find(
            (part) => part.type === "text"
        )?.text;
        if (messageContent) {
            setEditing(false);
            setEditedContent(messageContent);
        }
    };

    const canRegenerate =
        message.role === "assistant" ||
        (message.role === "user" && index === messages.length - 1);

    const messageActions = editing
        ? [
              message.role === "user" && {
                  Icon: RefreshCw,
                  tooltip: "Save & Regenerate",
                  onClick: saveMessageEditAndRegenerate,
                  className: cn("text-blue-500 hover:text-blue-400", className)
              },
              {
                  Icon: Check,
                  tooltip: "Save",
                  onClick: saveMessageEdit,
                  className: cn(
                      "text-green-500 hover:text-green-400",
                      className
                  )
              },
              {
                  Icon: X,
                  tooltip: "Cancel",
                  onClick: cancelMessageEdit,
                  className: cn(
                      "text-destructive hover:text-destructive",
                      className
                  )
              }
          ]
        : [
              canRegenerate && {
                  Icon: RefreshCw,
                  tooltip: "Regenerate",
                  onClick: regenerateMessage
              },
              {
                  Icon: Split,
                  tooltip: "Fork",
                  onClick: forkChat
              },
              {
                  Icon: copied ? Check : Copy,
                  tooltip: copied ? "Copied!" : "Copy",
                  onClick: copyMessage,
                  className: cn(copied && "text-green-500 hover:text-green-400")
              },
              {
                  Icon: Pencil,
                  tooltip: "Edit",
                  onClick: editMessage
              },
              {
                  Icon: Trash2,
                  tooltip: "Delete",
                  onClick: deleteMessage,
                  className: "text-destructive hover:text-destructive"
              }
          ];

    const messageButtons = messageActions
        .filter((value) => value !== false)
        .map((action) => (
            <MessageButton
                key={action.tooltip}
                Icon={action.Icon}
                tooltip={action.tooltip}
                onClick={action.onClick}
                disabled={status !== "ready"}
                className={action.className}
            />
        ));

    return (
        <ButtonGroup aria-label="Message Actions">{messageButtons}</ButtonGroup>
    );
}
