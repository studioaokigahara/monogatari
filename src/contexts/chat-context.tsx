import { chatStore, ChatStore } from "@/stores/chat-store";
import { useStore } from "@tanstack/react-store";
import { ReactNode } from "react";
import { useChatWithGraph } from "@/hooks/use-chat-with-graph";

export function ChatProvider({ children }: { children: ReactNode }) {
    useChatWithGraph();

    return children;
}

// backwards-compatible hook
export function useChatContext<T>(selector: (store: ChatStore) => T): T {
    return useStore(chatStore, selector);
}
