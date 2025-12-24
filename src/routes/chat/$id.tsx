import MessageThread from "@/routes/chat/components/message-thread";
import { MessageInput } from "@/routes/chat/components/message-input";
import { ChatProvider } from "@/contexts/chat-context";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

function Chat() {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <ChatProvider>
            <MessageThread scrollRef={scrollRef} />
            <MessageInput scrollRef={scrollRef} />
        </ChatProvider>
    );
}

export const Route = createFileRoute("/chat/$id")({
    component: Chat
});
