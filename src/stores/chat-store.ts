import { Store } from "@tanstack/store";
import { Message, UseChatHelpers } from "@ai-sdk/react";
import { Attachment } from "ai";
import { ConversationGraph } from "@/types/conversation-graph";

export interface ChatState {
    messages: Message[];
    error: UseChatHelpers["error"];
    input: UseChatHelpers["input"];
    status: UseChatHelpers["status"];
    id: UseChatHelpers["id"];
    data: UseChatHelpers["data"];

    graph: ConversationGraph | null;
    vertexMap: Map<string, string>;
    siblingIndex: Record<string, number>;
    attachments: FileList | Attachment[];
}

export interface ChatActions {
    setMessages: UseChatHelpers["setMessages"];
    append: UseChatHelpers["append"];
    reload: UseChatHelpers["reload"];
    stop: UseChatHelpers["stop"];
    setInput: UseChatHelpers["setInput"];
    handleInputChange: UseChatHelpers["handleInputChange"];
    handleSubmit: UseChatHelpers["handleSubmit"];
    setData: UseChatHelpers["setData"];
    addToolResult: ({
        toolCallId,
        result
    }: {
        toolCallId: string;
        result: unknown;
    }) => void;

    branchFrom: (vertexID: string) => void;
    deleteVertex: (vertexID: string) => void;
    goToNextSibling: (vertexID: string) => void;
    goToPreviousSibling: (vertexID: string) => void;
}

export type ChatStore = ChatState & ChatActions;

export const chatStore = new Store<ChatStore>({
    messages: [],
    error: undefined,
    input: "",
    status: "ready" as const,
    id: "",
    data: undefined,

    graph: null,
    vertexMap: new Map(),
    siblingIndex: {},
    attachments: [],

    setMessages: () => {
        throw new Error("not hydrated");
    },
    append: () => {
        throw new Error("not hydrated");
    },
    reload: () => {
        throw new Error("not hydrated");
    },
    stop: () => {
        throw new Error("not hydrated");
    },
    setInput: () => {
        throw new Error("not hydrated");
    },
    handleInputChange: () => {
        throw new Error("not hydrated");
    },
    handleSubmit: () => {
        throw new Error("not hydrated");
    },
    setData: () => {
        throw new Error("not hydrated");
    },
    addToolResult: () => {
        throw new Error("not hydrated");
    },

    branchFrom: () => {
        throw new Error("not hydrated");
    },
    deleteVertex: () => {
        throw new Error("not hydrated");
    },
    goToNextSibling: () => {
        throw new Error("not hydrated");
    },
    goToPreviousSibling: () => {
        throw new Error("not hydrated");
    }
});
