import { Chat } from "@/database/schema/chat";
import ReactFlow, { Background } from "reactflow";
import { GraphRenderer } from "./renderer";

export default function GraphLoader({ chat }: { chat: Chat }) {
    if (!chat) {
        return (
            <ReactFlow>
                <Background />
            </ReactFlow>
        );
    }

    return <GraphRenderer chat={chat} />;
}
