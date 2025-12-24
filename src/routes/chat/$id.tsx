import MessageThread from "@/routes/chat/components/message-thread";
import { MessageInput } from "@/routes/chat/components/message-input";
import { ChatProvider } from "@/contexts/chat-context";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Chat as ChatSchema } from "@/database/schema/chat";
import { Character } from "@/database/schema/character";

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
    component: Chat,
    beforeLoad: async ({ params: { id } }) => {
        const { record } = await ChatSchema.load(id);

        if (record.title) {
            return { breadcrumb: record.title };
        } else {
            const character = await Character.load(record.characterIDs[0]);
            return { breadcrumb: `Chat with ${character.data.name}` };
        }
    },
    head: ({ match }) => ({
        meta: [{ title: `${match.context.breadcrumb} - Monogatari` }]
    })
});
