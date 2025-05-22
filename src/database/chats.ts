import { db } from "@/database/database";
import {
    ConversationGraph,
    type GraphObject,
} from "@/types/conversation-graph";

export async function saveGraph(
    graph: ConversationGraph,
    characterIDs: string[],
    title?: string,
) {
    const now = new Date();
    const snapshot = graph.save();
    const existing = await db.chats.get(snapshot.id);

    const record = {
        id: snapshot.id,
        characterIDs,
        vertices: snapshot.vertices,
        terminalVertices: snapshot.terminalVertices,
        activeVertex: snapshot.activeVertex,
        title: title || existing?.title,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    };

    await db.chats.put(record);
}

export async function loadGraph(
    chatID: string,
): Promise<ConversationGraph | undefined> {
    const record = await db.chats.get(chatID);
    if (!record) return;

    const graphObject: GraphObject = {
        id: record.id,
        vertices: record.vertices,
        terminalVertices: record.terminalVertices,
        activeVertex: record.activeVertex,
        metadata: {
            title: record.title,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        },
    };
    const graph = ConversationGraph.restore(graphObject);
    return graph;
}

export async function updateGraph(chatID: string, title: string) {
    const existing = await db.chats.get(chatID);
    if (!existing) return;

    await db.chats.update(chatID, {
        title: title,
        updatedAt: new Date(),
    });
}

export async function listAllChats() {
    return db.chats.orderBy("updatedAt").reverse().toArray();
}
