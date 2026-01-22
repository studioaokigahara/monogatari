import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import { ChatProvider } from "@/routes/chat/components/chat-provider";
import { MessageInput } from "@/routes/chat/components/message-input";
import MessageThread from "@/routes/chat/components/message-thread";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

function ChatLayout() {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <ChatProvider>
            <MessageThread scrollRef={scrollRef} />
            <MessageInput scrollRef={scrollRef} />
        </ChatProvider>
    );
}

export const Route = createFileRoute("/chat/$id")({
    component: ChatLayout,
    beforeLoad: async ({ params: { id } }) => {
        const chat = await Chat.load(id);

        if (chat.title) {
            return { breadcrumb: chat.title };
        } else {
            const character = await Character.load(chat.characterIDs[0]);
            return { breadcrumb: `Chat with ${character.data.name}` };
        }
    },
    head: ({ match }) => ({
        meta: [{ title: `${match.context.breadcrumb} - Monogatari` }]
    })
});
