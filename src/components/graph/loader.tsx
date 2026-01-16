import { Chat } from "@/database/schema/chat";
import { ChatGraph } from "@/lib/graph";
import { useEffect, useState } from "react";
import ReactFlow, { Background } from "reactflow";
import { GraphRenderer } from "./renderer";

export default function GraphLoader({ id }: { id: string }) {
    const [graph, setGraph] = useState<ChatGraph>();

    useEffect(() => {
        let canceled = false;

        void Chat.load(id).then((result) => {
            if (canceled) return;
            setGraph(result?.graph ?? new ChatGraph(id));
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
