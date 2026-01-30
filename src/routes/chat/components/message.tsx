import { Markdown } from "@/components/markdown";
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
            <Dot strokeWidth={6} className="-ml-3 animate-bounce delay-100" />
            <Dot strokeWidth={6} className="-ml-3 animate-bounce delay-200" />
        </div>
    );
}

interface MessageProps {
    message: MessageType;
    index: number;
    streaming: boolean;
    showTypingIndicator: boolean;
}

export function Message({ message, index, streaming, showTypingIndicator }: MessageProps) {
    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(
        message.parts.find((part) => part.type === "text")?.text ?? ""
    );

    const handleEdit = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedContent(event.target.value);
    };

    const messageClasses =
        "relative message-tail-path dark:group-data-[role=user]:[--tw-prose-body:--tw-prose-invert-headings] group-data-[role=user]:bg-blue-500 group-data-[role=user]:before:bg-blue-500 group-data-[role=user]:mr-[12.25px] group-data-[role=user]:rounded-3xl group-data-[role=user]:max-w-4/5 group-data-[role=user]:px-3 group-data-[role=user]:py-2 group-data-[role=user]:justify-self-end group-data-[role=assistant]:max-w-full";

    const buttonClasses = `group-data-[role=user]:last:mr-[12.25px]`;

    const showButtons = hovered || editing;

    const messageParts = message.parts.map((part, index) => {
        switch (part.type) {
            case "text":
                return (
                    <Markdown
                        key={`${message.id}-text-${index}`}
                        id={message.id}
                        streaming={streaming}
                        className={messageClasses}
                    >
                        {part.text}
                    </Markdown>
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
                    onChange={handleEdit}
                    className={cn(
                        "w-full resize-none rounded border border-gray-300 bg-transparent p-2 dark:border-gray-700",
                        messageClasses
                    )}
                />
            ) : (
                <>{messageParts}</>
            )}
            <ButtonGroup
                aria-label="Message Buttons"
                className={cn(
                    "my-2 flex min-h-8 items-center group-data-[role=user]:justify-self-end",
                    !editing &&
                        "opacity-0 transition-opacity will-change-[opacity] group-hover:opacity-100"
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
                            editing={editing}
                            setEditing={setEditing}
                            editedContent={editedContent}
                            setEditedContent={setEditedContent}
                            className={buttonClasses}
                        />
                    </>
                )}
            </ButtonGroup>
        </div>
    );
}
