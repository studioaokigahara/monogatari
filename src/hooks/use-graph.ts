import { ChatManager } from "@/database/chats";
import { ConversationGraph } from "@/types/conversation-graph";
import { useCallback, useEffect, useMemo, useState } from "react";

interface useGraphProps {
    chatID?: string;
}

export function useGraph({ chatID }: useGraphProps) {
    const defaultGraph = useMemo(
        () => (chatID ? new ConversationGraph([], chatID) : null),
        [chatID]
    );

    const [graph, setGraph] = useState<ConversationGraph | null>(defaultGraph);
    const [characterIDs, setCharacterIDs] = useState<string[]>([]);
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [loaded, setLoaded] = useState(false);
    const [vertexMap, setVertexMap] = useState(new Map<string, string>());

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
            const result = await ChatManager.loadGraph(chatID);
            if (canceled) return;

            const graph = result?.graph ?? defaultGraph;
            setGraph(graph);
            const newVertexMap = new Map<string, string>();
            graph!
                .save()
                .vertices.forEach((v) =>
                    v.messages.forEach((m) => newVertexMap.set(m.id, v.id))
                );
            setVertexMap(newVertexMap);

            setCharacterIDs(result?.record?.characterIDs || []);
            setTitle(result?.record?.title);
            setLoaded(true);
        };

        initGraph();

        return () => {
            canceled = true;
        };
    }, [chatID, defaultGraph]);

    const saveGraph = useCallback(async () => {
        if (!graph || !loaded) return;
        await ChatManager.saveGraph(graph, characterIDs, title);
    }, [graph, loaded, characterIDs, title]);

    return {
        graph,
        loaded,
        characterIDs,
        setCharacterIDs,
        title,
        setTitle,
        vertexMap,
        setVertexMap,
        saveGraph
    };
}
