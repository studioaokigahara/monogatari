import { GraphSyncManager } from "@/lib/graph/sync";
import { Message } from "@/types/message";
import { Chat } from "@ai-sdk/react";
import { createContext, useContext } from "react";

interface ChatContext {
    graphSync: GraphSyncManager;
    chat: Chat<Message>;
}

const ChatContext = createContext<ChatContext | undefined>(undefined);

function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatContext.Provider.");
    }
    return context;
}

export { ChatContext, useChatContext };
