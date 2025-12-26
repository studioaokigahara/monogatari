import { db } from "@/database/monogatari-db";
import { ChatGraph, GraphSnapshot, Vertex } from "@/lib/graph";
import { replaceMacros } from "@/lib/macros";
import { generateCuid2 } from "@/lib/utils";
import { type Message } from "@/types/message";
import { z } from "zod";
import { Character } from "./character";
import { Persona } from "./persona";

const ChatRecord = z.object({
    /** the graph’s root ID (also the PK) */
    id: z.string().default(generateCuid2),
    characterIDs: z.array(z.string()),
    // TODO: per-chat persona ID, switch persona to stored ID on chat load
    personaID: z.string().optional(),
    /** all vertices */
    vertices: z.array(Vertex),
    activeVertex: z.string(),
    activeTerminalVertices: z.record(z.string(), z.string()),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    // optional metadata
    title: z.string().optional(),
    fork: z.string().optional()
});
type ChatRecord = z.infer<typeof ChatRecord>;

export class Chat implements ChatRecord {
    id: string;
    characterIDs: string[];
    vertices: Vertex[];
    activeVertex: string;
    activeTerminalVertices: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    title?: string;
    fork?: string;

    constructor(character: Character, persona?: Persona) {
        const graph = new ChatGraph();
        const now = new Date();

        const greetings = [
            character.data.first_mes,
            ...character.data.alternate_greetings
        ];

        for (let i = 0; i < greetings.length; i++) {
            const message: Message = {
                id: `greeting-${i + 1}-${generateCuid2()}`,
                role: "assistant",
                parts: [
                    {
                        type: "text",
                        text: replaceMacros(greetings[i], {
                            character,
                            persona
                        })
                    }
                ],
                metadata: {
                    createdAt: now
                }
            };
            graph.createVertex(graph.id, [message]);
        }

        const root = graph.getVertex(graph.id);
        if (root && root.children.length >= 0) {
            graph.activeVertex = root.children[0];
        }

        const snapshot = graph.save();

        this.id = snapshot.id;
        this.characterIDs = [character.id];
        this.vertices = snapshot.vertices;
        this.activeTerminalVertices = snapshot.activeTerminalVertices;
        this.activeVertex = snapshot.activeVertex;
        this.createdAt = now;
        this.updatedAt = now;
    }

    async save() {
        const record = await ChatRecord.parseAsync(this);
        Object.assign(this, record);
        await db.chats.put(this);
    }

    static async saveGraph(
        graph: ChatGraph,
        characterIDs: string[],
        title?: string
    ) {
        const now = new Date();
        const snapshot = graph.save();
        const existing = await db.chats.get(snapshot.id);

        const record = await ChatRecord.parseAsync({
            id: snapshot.id,
            characterIDs,
            vertices: snapshot.vertices,
            activeTerminalVertices: snapshot.activeTerminalVertices,
            activeVertex: snapshot.activeVertex,
            title: title ?? existing?.title,
            fork: existing?.fork,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        });

        await db.chats.put(record);
    }

    static async load(id: string) {
        const record = await db.chats.get(id);
        if (!record) {
            throw new Error(`Unable to load chat ${id}: ID invalid.`);
        }

        const snapshot: GraphSnapshot = {
            id: record.id,
            vertices: record.vertices,
            activeTerminalVertices: record.activeTerminalVertices,
            activeVertex: record.activeVertex,
            metadata: {
                title: record.title,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            }
        };

        const graph = ChatGraph.load(snapshot);

        return { record, graph };
    }

    static async fork(
        graph: ChatGraph,
        characterIDs: string[],
        title?: string,
        vertexToDelete?: string
    ) {
        const snapshot = graph.save();

        const record = await ChatRecord.parseAsync({
            characterIDs,
            vertices: snapshot.vertices,
            activeTerminalVertices: snapshot.activeTerminalVertices,
            activeVertex: snapshot.activeVertex,
            title,
            fork: graph.id
        });

        await db.chats.put(record);

        if (vertexToDelete) {
            const { graph: newGraph, record: newRecord } = await this.load(
                record.id
            );
            newGraph.deleteVertex(vertexToDelete);
            await this.saveGraph(
                newGraph,
                newRecord.characterIDs,
                newRecord.title
            );
        }

        return record.id;
    }

    async updateTitle(title: string) {
        this.title = title;
        const record = await ChatRecord.parseAsync(this);
        Object.assign(this, record);
        await db.chats.put(this);
    }

    async delete() {
        await db.chats.delete(this.id);
    }
}
