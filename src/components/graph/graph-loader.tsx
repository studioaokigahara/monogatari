import { ChatManager } from "@/database/chats";
import { ConversationGraph } from "@/types/conversation-graph";
import { useEffect, useState } from "react";
import ReactFlow, { Background } from "reactflow";
import { GraphRenderer } from "../graph-renderer";

export function GraphLoader({ id }: { id: string }) {
    const [graph, setGraph] = useState<ConversationGraph | null>(null);

    useEffect(() => {
        let canceled = false;
        ChatManager.loadGraph(id).then((graph) => {
            if (canceled) return;
            setGraph(graph ?? new ConversationGraph([], id));
        });

        return () => {
            canceled = true;
        };
    }, [id]);

    if (!graph) {
        return (
            <ReactFlow>
                <Background />
            </ReactFlow>
        );
    }

    return <GraphRenderer graph={graph} />;
}
