import {
    ChatMessage,
    // ConversationGraph,
    Vertex,
} from "@/types/conversation-graph";
import { z } from "zod";

export const VertexRecord = z.object({
    id: z.string(),
    chatID: z.string(),
    messages: z.array(ChatMessage),
    metadata: z.record(z.any()).optional(),
});

export type VertexRecord = z.infer<typeof VertexRecord>;

export const EdgeRecord = z.object({
    parentID: z.string(),
    childID: z.string(),
});

export type EdgeRecord = z.infer<typeof EdgeRecord>;

export const ChatRecord = z.object({
    /** the graph’s root ID (also the PK) */
    id: z.string(),
    characterIDs: z.array(z.string()),
    /** all vertices */
    vertices: z.array(Vertex),
    /** the current head turn IDs */
    terminalVertices: z.array(z.string()),
    activeVertex: z.string(),
    // optional metadata
    title: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type ChatRecord = z.infer<typeof ChatRecord>;
