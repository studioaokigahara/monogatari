import {
    Action,
    ActionButtons,
    SiblingNavigator,
} from "@/components/chat/buttons";
import { Prose } from "@/components/prose";
import { useChatContext } from "@/contexts/chat-context";
import { cn, nanoid } from "@/lib/utils";
import { Message } from "@ai-sdk/react";
import { Check, Copy, Dot, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import {
    memo,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";

function TypingIndicator() {
    return (
        <div className="flex flex-row p-4 mb-4">
            <Dot strokeWidth={6} className="animate-bounce" />
            <Dot strokeWidth={6} className="animate-bounce delay-100 -ml-3" />
            <Dot strokeWidth={6} className="animate-bounce delay-200 -ml-3" />
        </div>
    );
}

interface MessageItemProps {
    message: Message;
    index: number;
}

const MessageItem = memo(
    function MessageItem({ message, index }: MessageItemProps) {
        const messages = useChatContext((context) => context.messages);
        const status = useChatContext((context) => context.status);
        const reload = useChatContext((context) => context.reload);
        const graph = useChatContext((context) => context.graph);
        const branchFrom = useChatContext((context) => context.branchFrom);
        const setMessages = useChatContext((context) => context.setMessages);
        const vertexMap = useChatContext((context) => context.vertexMap);
        const deleteVertex = useChatContext((context) => context.deleteVertex);
        const siblingIndex = useChatContext((context) => context.siblingIndex);
        const goToNextSibling = useChatContext(
            (context) => context.goToNextSibling,
        );
        const goToPreviousSibling = useChatContext(
            (context) => context.goToPreviousSibling,
        );

        const currentID = vertexMap.get(message.id);
        const vertex = currentID ? graph.getVertex(currentID) : undefined;
        const parentID = vertex?.parents[0];
        const parent = parentID ? graph.getVertex(parentID) : undefined;
        const siblings = parent?.children ?? [];
        const totalSiblings = siblings.length;
        const currentSibling =
            parentID && siblingIndex[parentID] !== undefined
                ? siblingIndex[parentID] + 1
                : siblings.findIndex((v) => v === currentID) + 1;

        const handlePrevious = useCallback(
            () => goToPreviousSibling(message.id),
            [goToPreviousSibling, message.id],
        );

        const handleNext = useCallback(
            () => goToNextSibling(message.id),
            [goToNextSibling, message.id],
        );

        const handleReload = useCallback(async () => {
            if (message.role === "assistant") {
                const prev = messages[index - 1];
                if (!prev || prev.role !== "user") return;
                const v = vertexMap.get(prev.id);
                if (!v) return;
                branchFrom(v);
                setMessages((msgs) => msgs.slice(0, index));
            } else {
                const v = vertexMap.get(message.id);
                if (!v) return;
                branchFrom(v);
                setMessages((msgs) => msgs.slice(0, index + 1));
            }
            reload();
        }, [
            message,
            messages,
            setMessages,
            index,
            vertexMap,
            branchFrom,
            reload,
        ]);

        const handleCopy = useCallback(async () => {
            await navigator.clipboard.writeText(message.content);
            toast.success("Copied!");
        }, [message.content]);

        const handleDelete = useCallback(async () => {
            const vertexID = vertexMap.get(message.id);
            if (!vertexID) return;
            deleteVertex(vertexID);
            setMessages((msgs) => msgs.slice(0, index - 1));
            toast.success("Message deleted.");
        }, [message.id, vertexMap, deleteVertex, setMessages, index]);

        const [isEditing, setIsEditing] = useState(false);
        const [editedContent, setEditedContent] = useState(message.content);

        const handleEdit = useCallback(() => {
            setIsEditing(true);
            setEditedContent(message.content);
        }, [message.content]);

        const handleCancelEdit = useCallback(() => {
            setIsEditing(false);
            setEditedContent(message.content);
        }, [message.content]);

        const handleSaveEdit = useCallback(async () => {
            if (message.role === "user") {
                const currentVertex = vertexMap.get(message.id);
                if (!currentVertex) return;
                const parentVertex = graph.getVertex(currentVertex)?.parents[0];
                if (!parentVertex) return;

                branchFrom(parentVertex);
                setMessages((msgs) => {
                    const newMsgs = msgs.slice(0, index);
                    newMsgs.push({
                        id: nanoid(),
                        role: "user",
                        content: editedContent,
                        createdAt: new Date(),
                    });
                    return newMsgs;
                });
                reload();
            } else {
                setMessages((msgs) => {
                    const newMsgs = [...msgs];
                    newMsgs[index] = { ...message, content: editedContent };
                    return newMsgs;
                });
            }
            setIsEditing(false);
            toast.success("Message updated.");
        }, [
            message,
            editedContent,
            messages,
            index,
            vertexMap,
            branchFrom,
            setMessages,
            reload,
        ]);

        const actions: Action[] = [];

        if (isEditing) {
            actions.push({
                Icon: Check,
                onClick: handleSaveEdit,
            });
            actions.push({
                Icon: X,
                onClick: handleCancelEdit,
            });
        } else {
            // Show reload for assistant messages or if this is the last user message
            if (
                message.role === "assistant" ||
                (message.role === "user" && index === messages.length - 1)
            ) {
                actions.push({
                    Icon: RefreshCw,
                    onClick: handleReload,
                });
            }
            actions.push({
                Icon: Copy,
                onClick: handleCopy,
            });
            actions.push({
                Icon: Pencil,
                onClick: handleEdit,
            });
            actions.push({
                Icon: Trash2,
                onClick: handleDelete,
            });
        }

        const userClasses =
            "relative message-tail-path dark:group-data-[role=user]:[--tw-prose-body:--tw-prose-invert-headings] group-data-[role=user]:bg-blue-500 group-data-[role=user]:before:bg-blue-500 group-data-[role=user]:mr-[12.25px] group-data-[role=user]:rounded-3xl group-data-[role=user]:max-w-4/5 group-data-[role=user]:px-3 group-data-[role=user]:py-2";
        const buttonClasses = `group-data-[role=user]:last:mr-[12.25px] transition-opacity opacity-0 group-hover:opacity-100`;

        return (
            <div
                data-role={message.role}
                className={cn(
                    `group last:mb-4 space-y-1`,
                    message.role === "user" && "justify-items-end",
                )}
            >
                {isEditing ? (
                    <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={cn(
                            "w-full p-2 h-32 rounded border border-gray-300 dark:border-gray-700 bg-transparent resize-none",
                            message.role === "user"
                                ? userClasses
                                : "max-w-full",
                        )}
                    />
                ) : (
                    <Prose
                        id={message.id}
                        className={cn(
                            message.role === "user"
                                ? userClasses
                                : "group-data-[role=assistant]:max-w-full",
                        )}
                    >
                        {message.content}
                    </Prose>
                )}
                <div className="flex items-center">
                    <SiblingNavigator
                        current={currentSibling}
                        total={totalSiblings}
                        disabled={status !== "ready"}
                        editing={isEditing}
                        className={buttonClasses}
                        goToPreviousSibling={handlePrevious}
                        goToNextSibling={handleNext}
                    />
                    <ActionButtons
                        actions={actions}
                        disabled={status !== "ready"}
                        className={buttonClasses}
                    />
                </div>
            </div>
        );
    },
    (prev, next) =>
        prev.message.id === next.message.id &&
        prev.message.role === next.message.role &&
        prev.message.content === next.message.content &&
        prev.index === next.index,
);

const ChatMessages = memo(function ChatMessages() {
    const messages = useChatContext((context) => context.messages);
    const status = useChatContext((context) => context.status);
    const scrollRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex sm:w-2xl @min-[1025px]:w-3xl sm:mx-auto place-center">
            <div className="mt-4 mb-16">
                {messages.map((m, i) => {
                    if (m.role === "system") return;
                    return <MessageItem key={m.id} message={m} index={i} />;
                })}
                {status === "submitted" && <TypingIndicator />}
                <div ref={scrollRef} />
            </div>
        </div>
    );
});

export default ChatMessages;
