import MessageThread from "@/routes/chat/components/message-thread";
import { SendForm } from "@/routes/chat/components/send-form";
import { ChatProvider } from "@/contexts/chat-context";
import { createFileRoute } from "@tanstack/react-router";

function Chat() {
    return (
        <ChatProvider>
            <MessageThread />
            <SendForm />
        </ChatProvider>
    );
}

export const Route = createFileRoute("/chat/$id")({
    component: Chat
});
