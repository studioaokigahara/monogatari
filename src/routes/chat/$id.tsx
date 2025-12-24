import MessageThread from "@/routes/chat/components/message-thread";
import { SendForm } from "@/routes/chat/components/send-form";
import { ChatProvider } from "@/contexts/chat-context";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

function Chat() {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <ChatProvider>
            <MessageThread scrollRef={scrollRef} />
            <SendForm scrollRef={scrollRef} />
        </ChatProvider>
    );
}

export const Route = createFileRoute("/chat/$id")({
    component: Chat
});
