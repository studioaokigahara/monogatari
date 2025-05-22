import { loadGraph, saveGraph } from "@/database/chats";
import { db } from "@/database/database";
import { ChatMessage, ConversationGraph } from "@/types/conversation-graph";
import { useLocation } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface useGraphProps {
    messages: UIMessage[];
    status: "error" | "submitted" | "streaming" | "ready";
}

export function useGraph({ messages, status }: useGraphProps) {
    const location = useLocation();
    const isChatRoute = location.pathname.startsWith("/chat");
    const chatID = isChatRoute
        ? location.pathname.replace(/^\/chat\//, "")
        : undefined;

    const defaultGraph = useMemo(
        () => (chatID ? new ConversationGraph([], chatID) : null),
        [chatID],
    );

    const [graph, setGraph] = useState<ConversationGraph | null>(defaultGraph);
    const [characterIDs, setCharacterIDs] = useState<string[]>([]);
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [loaded, setLoaded] = useState(false);

    const vertexMap = useRef(new Map<string, string>());

    const lastSavedIndex = useRef(0);
    const workingVertex = useRef<string | null>(null);

    const branchFrom = useCallback(
        (vertexID: string) => {
            if (!graph) return;

            workingVertex.current = vertexID;
            graph.setActiveVertex(vertexID);
        },
        [graph],
    );

    const deleteVertex = useCallback(
        async (vertexID: string) => {
            if (!graph) return;

            graph.deleteVertex(vertexID);
            await saveGraph(graph, characterIDs, title);
        },
        [graph, characterIDs, title],
    );

    useEffect(() => {
        if (!chatID) {
            setGraph(null);
            setCharacterIDs([]);
            setTitle(undefined);
            setLoaded(false);
            return;
        }

        let canceled = false;
        const initGraph = async () => {
            const record = await db.chats.get(chatID);
            if (!record || canceled) return;

            const loadedGraph = await loadGraph(chatID);
            if (canceled) return;

            const graph = loadedGraph ?? defaultGraph;
            setGraph(graph);
            vertexMap.current.clear();
            graph!
                .save()
                .vertices.forEach((v) =>
                    v.messages.forEach((m) =>
                        vertexMap.current.set(m.id, v.id),
                    ),
                );

            setCharacterIDs(record.characterIDs);
            setTitle(record.title);
            setLoaded(true);

            const flatGraph = graph!.flatten();
            lastSavedIndex.current = flatGraph.length;
        };

        initGraph();

        return () => {
            canceled = true;
        };
    }, [chatID, defaultGraph]);

    useEffect(() => {
        if (!graph || !loaded || !chatID || status !== "ready") return;

        let sliceStart = lastSavedIndex.current;
        if (workingVertex.current) {
            sliceStart = messages.reduce((acc, message, index) => {
                return vertexMap.current.get(message.id) ===
                    workingVertex.current
                    ? index + 1
                    : acc;
            }, lastSavedIndex.current);
        }
        const unsaved = messages.slice(sliceStart);
        if (unsaved.length === 0 && !workingVertex.current) return;

        const persistUnsaved = async () => {
            let currentVertex = workingVertex.current ?? graph.activeVertex;

            workingVertex.current = null;
            for (const message of unsaved) {
                const parsed = ChatMessage.parse(message);
                currentVertex = graph.branchFrom(currentVertex, [parsed]);
                vertexMap.current.set(parsed.id, currentVertex);
            }

            lastSavedIndex.current = messages.length;
            await saveGraph(graph, characterIDs, title);
        };

        persistUnsaved();
    }, [messages, status, graph, loaded, chatID, characterIDs, title]);

    return {
        graph,
        graphID: chatID,
        loaded,
        characterIDs,
        title,
        setTitle,
        branchFrom,
        vertexMap: vertexMap.current,
        deleteVertex,
    };
}
