import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { replaceMacros } from "@/lib/macros";
import { generateCuid2 } from "@/lib/utils";
import { Message } from "@/types/message";
import { z } from "zod";

/**
 * A single “turn” in the conversation graph. Each vertex can have
 * multiple children (branching) but only one parent
 */
const Vertex = z
    .object({
        /** The vertex ID, which is the same as the message ID */
        id: z.string(),
        /** Message. Only null if the vertex is the root vertex. */
        message: Message.nullable(),
        /** Upstream vertex the current vertex descends from. Only null if the vertex is the root vertex. */
        parent: z.string().nullable(),
        /** Downstream vertices (branches) that continue from this vertex */
        children: z.array(z.string())
    })
    .superRefine((vertex, context) => {
        if (vertex.parent === null && vertex.message !== null) {
            context.addIssue({
                code: "custom",
                message: "Root vertex must have null message",
                path: ["message"]
            });
            return;
        }

        if (!vertex.message) {
            context.addIssue({
                code: "custom",
                message: "Non-root vertex must have a message",
                path: ["message"]
            });
            return;
        }

        if (vertex.id !== vertex.message.id) {
            context.addIssue({
                code: "custom",
                message: "Vertex ID must be the same as the vertex message ID",
                path: ["id"]
            });
            return;
        }
    });
type Vertex = z.infer<typeof Vertex>;

const ChatRecord = z.object({
    /** the graph’s root ID (also the PK) */
    id: z.string().default(generateCuid2),
    characterIDs: z.array(z.string()),
    // TODO: per-chat persona ID, switch persona to stored ID on chat load
    personaID: z.string().optional(),
    /** all vertices */
    vertices: z.array(Vertex),
    terminalVertices: z.record(z.string(), z.string()),
    activeVertex: z.string(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    // optional metadata
    title: z.string().optional(),
    /** Points to the parent chat ID if the current chat is a fork, undefined otherwise  */
    fork: z.string().optional()
});
type ChatRecord = z.infer<typeof ChatRecord>;

export class Chat implements ChatRecord {
    readonly id: string;
    characterIDs: string[];
    vertices: Vertex[];
    terminalVertices: Record<string, string>;
    activeVertex: string;
    createdAt: Date;
    updatedAt: Date;
    title?: string;
    fork?: string;

    #vertexMap?: Map<string, Vertex>;
    #terminalVertexMap?: Map<string, string>;

    constructor(character: Character, persona?: Persona) {
        this.id = generateCuid2();
        this.characterIDs = [character.id];

        const root: Vertex = {
            id: this.id,
            message: null,
            parent: null,
            children: []
        };

        this.vertices = [root];
        this.activeVertex = this.id;
        this.terminalVertices = {};

        const now = new Date();
        this.createdAt = now;
        this.updatedAt = now;

        const greetings = [character.data.first_mes, ...character.data.alternate_greetings];

        for (let i = 0; i < greetings.length; ++i) {
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
            this.createVertex(this.id, message);
        }

        if (root.children.length > 0) {
            this.activeVertex = root.children[0];
        }
    }

    private get vertexMap() {
        this.#vertexMap ??= new Map(this.vertices.map((vertex) => [vertex.id, vertex]));
        return this.#vertexMap;
    }

    private get terminalVertexMap() {
        this.#terminalVertexMap ??= new Map(Object.entries(this.terminalVertices));
        return this.#terminalVertexMap;
    }

    private updateTerminalVertices(vertexID: string) {
        const path = this.getParents(vertexID);
        for (let i = 0; i < path.length - 1; ++i) {
            const parent = path[i];
            if (parent.children.length > 1) {
                const child = path[i + 1].id;
                this.terminalVertexMap.set(child, vertexID);
                this.terminalVertices = Object.fromEntries(this.terminalVertexMap);
            }
        }
    }

    setActiveVertex(vertexID: string, updateTerminalVertices: boolean) {
        this.activeVertex = vertexID;
        if (updateTerminalVertices) {
            this.updateTerminalVertices(vertexID);
        }
    }

    /**
     * Creates a new vertex, branching from an existing vertex.
     * @returns The new vertex’s ID
     */
    createVertex(parentID: string, message: Message): string {
        const parent = this.vertexMap.get(parentID);
        if (!parent) {
            throw new Error(`Parent turn ${parentID} not found.`);
        }

        const newVertex: Vertex = {
            id: message.id,
            message,
            parent: parentID,
            children: []
        };

        parent.children.push(newVertex.id);
        this.vertices = [...this.vertices, newVertex];
        this.vertexMap.set(newVertex.id, newVertex);
        this.setActiveVertex(newVertex.id, true);

        return newVertex.id;
    }

    getVertex(vertexID: string) {
        return this.vertexMap.get(vertexID);
    }

    updateVertex(message: Message) {
        const vertex = this.vertexMap.get(message.id);
        if (!vertex) {
            throw new Error(`Vertex ${message.id} does not exist in graph`);
        }

        const index = this.vertices.indexOf(vertex);
        if (index === -1) {
            throw new Error("Unable to get vertex index, message ID not in vertex messages array");
        }

        const updatedVertex: Vertex = { ...vertex, message };
        this.vertices = this.vertices.toSpliced(index, 1, updatedVertex);
        this.vertexMap.set(vertex.id, updatedVertex);
    }

    /** Deletes a vertex and all of its descendants. */
    deleteVertex(vertexID: string): void {
        const vertexToDelete = this.vertexMap.get(vertexID);
        if (!vertexToDelete) return;

        const deletedParent = vertexToDelete.parent;

        const trash = new Set<string>();
        const visit = (vertexID: string) => {
            if (trash.has(vertexID) || !this.vertexMap.has(vertexID)) return;
            trash.add(vertexID);
            this.vertexMap.get(vertexID)?.children.forEach(visit);
        };
        visit(vertexID);

        let newActiveVertex: string | null = null;
        if (trash.has(this.activeVertex) && deletedParent && !trash.has(deletedParent)) {
            const parent = this.vertexMap.get(deletedParent);
            if (parent) {
                const index = parent.children.indexOf(vertexID);
                const siblings = parent.children.filter((child) => child !== vertexID);
                if (siblings.length > 0) {
                    newActiveVertex = siblings[Math.min(index, siblings.length - 1)];
                } else {
                    newActiveVertex = deletedParent;
                }
            }
        }

        for (const vertexID of trash) {
            const vertex = this.vertexMap.get(vertexID)!;
            if (vertex.parent) {
                const parent = this.vertexMap.get(vertex.parent);
                if (parent && !trash.has(parent.id)) {
                    parent.children = parent.children.filter((child) => child !== vertexID);
                }
            }
            this.vertexMap.delete(vertexID);
            this.terminalVertexMap.delete(vertexID);
        }

        for (const [key, value] of this.terminalVertexMap) {
            if (trash.has(value)) this.terminalVertexMap.delete(key);
        }

        this.vertices = this.vertices.filter((vertex) => !trash.has(vertex.id));
        this.setActiveVertex(newActiveVertex ?? this.id, true);
    }

    /** Walks the parents of the given vertex recursively to build the linear history for a given turn */
    getParents(id: string): Vertex[] {
        const parents: Vertex[] = [];

        let current = this.vertexMap.get(id);
        while (current) {
            parents.unshift(current);
            current = current.parent ? this.vertexMap.get(current.parent) : undefined;
        }

        return parents;
    }

    /** Find the leaf vertex furthest down the tree from the given starting vertex using depth-first serach. */
    getDeepestChild(startVertex: string): string {
        let deepest = startVertex;
        let maxDepth = 0;

        const dfs = (id: string, depth: number) => {
            if (depth > maxDepth) {
                maxDepth = depth;
                deepest = id;
            }

            const vertex = this.vertexMap.get(id);
            if (!vertex) return;
            for (const child of vertex.children) {
                dfs(child, depth + 1);
            }
        };

        dfs(startVertex, 0);
        return deepest;
    }

    getTargetSibling(vertexID: string, offset: number) {
        const vertex = this.vertexMap.get(vertexID);
        if (!vertex || !vertex.parent) return;

        const parent = this.vertexMap.get(vertex.parent);
        if (!parent || parent.children.length < 2) return;

        const siblings = parent.children;
        const currentIndex = siblings.indexOf(vertexID);
        const newIndex = (currentIndex + offset + siblings.length) % siblings.length;
        const siblingID = siblings[newIndex];

        const lastActiveSibling = this.terminalVertexMap.get(siblingID);
        const leafID = lastActiveSibling ? lastActiveSibling : this.getDeepestChild(siblingID);

        return leafID;
    }

    flatten(): Message[] {
        const path = this.getParents(this.activeVertex);
        return path.map((vertex) => vertex.message).filter((message) => message !== null);
    }

    async save() {
        const record = await ChatRecord.parseAsync(this);
        await db.chats.put(record);
        Object.assign(this, record);
    }

    static async load(id: string) {
        const record = await db.chats.get(id);
        if (!record) {
            throw new Error(`Unable to load chat ${id}: ID invalid.`);
        }
        return record;
    }

    static async fork(chat: Chat, vertexToDelete?: string) {
        if (vertexToDelete) {
            chat.deleteVertex(vertexToDelete);
            await chat.save();
        }

        const record = await ChatRecord.parseAsync({
            characterIDs: chat.characterIDs,
            vertices: chat.vertices,
            activeVertex: chat.activeVertex,
            activeTerminalVertices: chat.terminalVertices,
            title: chat.title,
            fork: chat.id
        });

        await db.chats.put(record);

        return record.id;
    }

    async updateTitle(title: string) {
        await db.chats.update(this.id, {
            title: title
        });
        this.title = title;
    }

    async delete() {
        await db.chats.delete(this.id);
    }
}
