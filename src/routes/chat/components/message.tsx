import { Prose } from "@/components/prose";
import { ButtonGroup } from "@/components/ui/button-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BranchSelector } from "@/routes/chat/components/branch-selector";
import { MessageActions } from "@/routes/chat/components/message-actions";
import { type Message as MessageType } from "@/types/message";
import { Dot } from "lucide-react";
import { useState } from "react";

function TypingIndicator() {
    return (
        <div className="flex flex-row">
            <Dot strokeWidth={6} className="animate-bounce" />
            <Dot strokeWidth={6} className="animate-bounce delay-100 -ml-3" />
            <Dot strokeWidth={6} className="animate-bounce delay-200 -ml-3" />
        </div>
    );
}

interface MessageProps {
    message: MessageType;
    index: number;
    streaming: boolean;
    showTypingIndicator: boolean;
}

export function Message({
    message,
    index,
    streaming,
    showTypingIndicator
}: MessageProps) {
    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(
        message.parts.find((part) => part.type === "text")?.text ?? ""
    );

    const messageClasses =
        "relative message-tail-path dark:group-data-[role=user]:[--tw-prose-body:--tw-prose-invert-headings] group-data-[role=user]:bg-blue-500 group-data-[role=user]:before:bg-blue-500 group-data-[role=user]:mr-[12.25px] group-data-[role=user]:rounded-3xl group-data-[role=user]:max-w-4/5 group-data-[role=user]:px-3 group-data-[role=user]:py-2 group-data-[role=user]:justify-self-end group-data-[role=assistant]:max-w-full";

    const buttonClasses = `group-data-[role=user]:last:mr-[12.25px]`;

    const showButtons = hovered || editing;

    const messageParts = message.parts.map((part, index) => {
        switch (part.type) {
            case "text":
                return (
                    <Prose
                        key={`${message.id}-text-${index}`}
                        id={message.id}
                        streaming={streaming}
                        className={messageClasses}
                    >
                        {part.text}
                    </Prose>
                );
            case "file": {
                if (part.mediaType?.startsWith("image/")) {
                    return (
                        <img
                            key={`${message.id}-file-${index}`}
                            src={part.url}
                            alt={part.filename}
                        />
                    );
                }
                break;
            }
            default:
                return;
        }
    });

    return (
        <div
            data-role={message.role}
            className="group last:mb-4"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setTimeout(() => setHovered(false), 150)}
        >
            {showTypingIndicator && <TypingIndicator />}
            {editing ? (
                <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className={cn(
                        "w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent resize-none",
                        messageClasses
                    )}
                />
            ) : (
                <>{messageParts}</>
            )}
            <ButtonGroup
                aria-label="Message Buttons"
                className={cn(
                    "flex items-center group-data-[role=user]:justify-self-end min-h-9 my-2",
                    !editing &&
                        "transition-opacity opacity-0 group-hover:opacity-100 will-change-[opacity]"
                )}
            >
                {showButtons && (
                    <>
                        <BranchSelector
                            message={message}
                            editing={editing}
                            className={buttonClasses}
                        />
                        <MessageActions
                            message={message}
                            index={index}
                            editingState={[editing, setEditing]}
                            editedContentState={[
                                editedContent,
                                setEditedContent
                            ]}
                            className={buttonClasses}
                        />
                    </>
                )}
            </ButtonGroup>
        </div>
    );
}
