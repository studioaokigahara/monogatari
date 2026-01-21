import { Chat } from "@/database/schema/chat";
import ReactFlow, { Background } from "reactflow";
import { GraphRenderer } from "./renderer";

export default function GraphLoader({ chat }: { chat: Chat }) {
    if (!graph) {
        return (
            <ReactFlow>
                <Background />
            </ReactFlow>
        );
    }

    return <GraphRenderer graph={chat} />;
}
