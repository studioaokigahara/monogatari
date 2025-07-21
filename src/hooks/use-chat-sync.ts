import { useRef, useEffect, useCallback } from "react";
import { ChatMessage, ConversationGraph } from "@/types/conversation-graph";
import { Message } from "@ai-sdk/react";

interface useChatSyncProps {
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    status: string;
    graph: ConversationGraph | null;
    loaded: boolean;
    chatID: string | undefined;
    vertexMap: Map<string, string>;
    setVertexMap: (map: Map<string, string>) => void;
    saveGraph: () => Promise<void>;
    title: string | undefined;
    setTitle: (title: string) => void;
}

export function useChatSync({
    messages,
    setMessages,
    status,
    graph,
    loaded,
    chatID,
    vertexMap,
    setVertexMap,
    saveGraph,
    title,
    setTitle
}: useChatSyncProps) {
    const workingVertex = useRef<string | null>(null);
    const titleGenerated = useRef<boolean>(false);

    useEffect(() => {
        const notReady = !graph || !loaded || !chatID || status !== "ready"

        if (notReady) return;

        let sliceStart = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (vertexMap.has(messages[i].id)) {
                sliceStart = i + 1;
                break;
            }
        }
        if (sliceStart === -1) sliceStart = 0;

        const unsavedMessages = messages.slice(sliceStart);
        if (unsavedMessages.length === 0 && !workingVertex.current) return;

        const persistUnsaved = async () => {
            let currentVertex = workingVertex.current ?? graph.activeVertex;
            workingVertex.current = null;

            const newVertexMap = new Map(vertexMap);
            for (const message of unsavedMessages) {
                const parsed = ChatMessage.parse(message);
                currentVertex = graph.branchFrom(currentVertex, [parsed]);
                newVertexMap.set(parsed.id, currentVertex);
            }

            setVertexMap(newVertexMap);
            await saveGraph();
        };

        persistUnsaved();
    }, [
        messages,
        status,
        graph,
        loaded,
        chatID,
        vertexMap,
        saveGraph
    ]);

    useEffect(() => {
        titleGenerated.current = Boolean(title);
    }, [chatID, title]);

    useEffect(() => {
        const shouldGenerateTitle =
            !titleGenerated.current &&
            !title &&
            messages.length >= 2 &&
            status === "ready";

        if (!shouldGenerateTitle) return;

        const generateTitle = async () => {
            try {
                const response = await fetch("/api/chat/completion", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [
                            ...messages,
                            {
                                role: "system",
                                content:
                                    "Generate a brief title (2-4 words) for this chat. Respond with ONLY the title."
                            }
                        ]
                    })
                });

                const generatedTitle = (await response.text())
                    .trim()
                    .replace(/^["']|["']$/g, "");
                if (!generatedTitle.endsWith("<!-- oai-proxy-error -->")) {
                    setTitle(generatedTitle);
                    await saveGraph();
                }
                titleGenerated.current = true;
            } catch (error) {
                console.error("Title generation failed:", error);
            }
        };

        generateTitle();
    }, [messages, status, title, setTitle, saveGraph]);

    const branchFrom = useCallback(
        (vertexID: string) => {
            if (!graph) return;

            workingVertex.current = vertexID;
            graph.setActiveVertex(vertexID);
        },
        [graph]
    );

    const deleteVertex = useCallback(
        async (vertexID: string) => {
            if (!graph) return;

            graph.deleteVertex(vertexID);
            await saveGraph();
        },
        [graph, saveGraph]
    );

    const getSibling = useCallback(
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

            const currentPath = graph.getParents(graph.activeVertex);
            const targetPath = graph.getParents(targetVertex);

            let commonAncestorIndex = -1;
            const minLength = Math.min(currentPath.length, targetPath.length);

            for (let i = 0; i < minLength; i++) {
                if (currentPath[i].id !== targetPath[i].id) break;
                commonAncestorIndex = i;
            }

            let divergentIndex = 0;
            for (let i = 0; i <= commonAncestorIndex; i++) {
                divergentIndex += currentPath[i].messages.length;
            }

            const prefix = messages.slice(0, divergentIndex);
            const suffix = targetPath
                        .slice(commonAncestorIndex + 1)
                        .flatMap(vertex => vertex.messages);

            const newMessages = [...prefix, ...suffix];

            const newVertexMap = new Map(vertexMap);

            for (let i = divergentIndex; i < messages.length; i++) {
                if (messages[i]) newVertexMap.delete(messages[i].id);
            }

            for (let i = commonAncestorIndex + 1; i < targetPath.length; i++) {
                const vertex = targetPath[i];
                for (const message of vertex.messages) {
                    newVertexMap.set(message.id, vertex.id);
                }
            }

            graph.setActiveVertex(targetVertex);

            return { newMessages, newVertexMap };
        },
        [graph, vertexMap, messages]
    );

    const goToNextSibling = useCallback(
        (messageID: string) => {
            const result = getSibling(messageID, 1);
            if (result) {
                const { newMessages, newVertexMap } = result;
                setMessages(newMessages);
                setVertexMap(newVertexMap);
            }
        },
        [getSibling]
    );

    const goToPreviousSibling = useCallback(
        (messageID: string) => {
            const result = getSibling(messageID, -1);
            if (result) {
                const { newMessages, newVertexMap } = result;
                setMessages(newMessages);
                setVertexMap(newVertexMap);
            }
        },
        [getSibling]
    );

    return {
        branchFrom,
        deleteVertex,
        goToNextSibling,
        goToPreviousSibling
    };
}
