import { updateGraph } from "@/database/chats";
import { db } from "@/database/database";
import { useGraph } from "@/hooks/use-graph";
import { ConversationGraph } from "@/types/conversation-graph";
import { Message, UseChatHelpers, useChat } from "@ai-sdk/react";
import { Attachment } from "ai";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import useEvent from "react-use-event-hook";
import { useCharacterContext } from "./character-context";
import { useSettingsContext } from "./settings-context";

import {
    createContext as createSelectiveContext,
    useContextSelector,
} from "use-context-selector";

interface ChatContextType extends Omit<UseChatHelpers, "isLoading"> {
    addToolResult: ({
        toolCallId,
        result,
    }: {
        toolCallId: string;
        result: unknown;
    }) => void;
    attachments: FileList | Attachment[];
    setAttachments: (attachments: FileList | Attachment[]) => void;
    graph: ConversationGraph;
    branchFrom: (vertexID: string) => void;
    vertexMap: Map<string, string>;
    deleteVertex: (vertexID: string) => void;
    goToNextSibling: (messageID: string) => void;
    goToPreviousSibling: (messageID: string) => void;
    siblingIndex: Record<string, number>;
}

const ChatContext = createSelectiveContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettingsContext();
    const { setCharacter } = useCharacterContext();

    const [chatID, setChatID] = useState<string | undefined>(undefined);
    const [initialMessages, setInitialMessages] = useState<
        Message[] | undefined
    >(undefined);
    const [attachments, setAttachments] = useState<FileList | Attachment[]>([]);
    const [siblingIndex, setSiblingIndex] = useState<Record<string, number>>(
        {},
    );

    const onFinish = async (message: Message) => {
        if (!chatID || !graph || !loaded) return;
        if (!titleGenerated.current && !title) {
            console.log("generating title...");
            titleGenerated.current = true;
            const response = await fetch("/api/chat/completion", {
                method: "POST",
                headers: new Headers({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({
                    messages: [
                        ...messages,
                        message,
                        {
                            role: "system",
                            content:
                                "Based on the conversation so far, generate a very brief title (2-4 words) that captures the essence of this chat. Respond with ONLY the title text.",
                        },
                    ],
                }),
            });
            const title = (await response.text())
                .trim()
                .replace(/^["']|["']$/g, "");
            if (title.endsWith("<!-- oai-proxy-error -->")) return;
            setTitle(title);
            await updateGraph(chatID!, title);
        }
    };

    const {
        messages,
        setMessages,
        error,
        append,
        reload,
        stop,
        input,
        setInput,
        handleInputChange: unstableInputChange,
        handleSubmit,
        status,
        id,
        data,
        setData,
        addToolResult,
    } = useChat({
        api: settings.streaming ? "/api/chat" : "/api/chat/completion",
        id: chatID,
        initialMessages: initialMessages,
        onFinish: onFinish,
    });

    const handleInputChange = useEvent((event) => unstableInputChange(event));

    const {
        graph,
        graphID,
        loaded,
        characterIDs,
        title,
        setTitle,
        branchFrom,
        vertexMap,
        deleteVertex,
    } = useGraph({ messages, status });

    useEffect(() => {
        if (!graph || !graphID || !loaded) return;

        setChatID(graphID);
        setInitialMessages(graph!.flatten());
    }, [graph, graphID, loaded]);

    const titleGenerated = useRef(false);
    useEffect(() => {
        titleGenerated.current = Boolean(title);
    }, [chatID, title]);

    useEffect(() => {
        if (!loaded || characterIDs.length === 0) {
            setCharacter(undefined);
            return;
        }

        db.characters.get(characterIDs[0]).then((character) => {
            setCharacter(character);
        });
    }, [loaded, characterIDs]);

    const cycleSibling = useCallback(
        (messageID: string, offset: number) => {
            if (!graph) return;

            const vertexID = vertexMap.get(messageID);
            if (!vertexID) return;

            const parentID = graph.getVertex(vertexID)?.parents[0];
            if (!parentID) return;

            const siblings = graph.getVertex(parentID)!.children;
            if (siblings.length < 2) return;

            let currentIndex = siblings.indexOf(vertexID);
            const newIndex =
                (currentIndex + offset + siblings.length) % siblings.length;
            const activeSibling = siblings[newIndex];

            const targetVertex = graph.diveFrom(activeSibling);
            graph.setActiveVertex(targetVertex);

            vertexMap.set(messageID, activeSibling);
            setMessages(graph.flatten());
            setSiblingIndex((map) => ({ ...map, [parentID]: newIndex }));
        },
        [graph, vertexMap, setMessages, setSiblingIndex],
    );

    const goToNextSibling = useCallback(
        (messageID: string) => cycleSibling(messageID, 1),
        [cycleSibling],
    );
    const goToPreviousSibling = useCallback(
        (messageID: string) => cycleSibling(messageID, -1),
        [cycleSibling],
    );

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                error,
                append,
                reload,
                stop,
                input,
                setInput,
                handleInputChange,
                handleSubmit,
                status,
                id,
                data,
                setData,
                addToolResult,
                attachments,
                setAttachments,
                graph: graph!,
                branchFrom,
                vertexMap,
                deleteVertex,
                goToNextSibling,
                goToPreviousSibling,
                siblingIndex,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext<T>(selector: (ctx: ChatContextType) => T): T {
    const ctx = useContextSelector(ChatContext, (context) => {
        if (!context)
            throw new Error("useChatContext must be inside ChatProvider");
        return selector(context);
    });

    return ctx;
}
