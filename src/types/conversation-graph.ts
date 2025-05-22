import { nanoid } from "@/lib/utils";
import type { Message } from "@ai-sdk/react";
import { z } from "zod";

export const ChatMessage = z
    .object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        createdAt: z.date(),
        modifiedAt: z.date().optional(),
    })
    .passthrough() satisfies z.ZodType<Message>;

export type ChatMessage = z.infer<typeof ChatMessage>;

/**
 * A single “turn” in the conversation graph:
 *  - 'messages' is an ordered batch of messages sent/received in that turn
 *  - a turn can have multiple parents (merging branches) and multiple children (branching)
 */
export const Vertex = z.object({
    /** unique identifier */
    id: z.string(),
    /** The messages in this turn */
    messages: z.array(ChatMessage),
    /** Upstream turns the current turn descends from */
    parents: z.array(z.string()),
    /** Downstream turns (branches) that continue from this turn */
    children: z.array(z.string()),
    /** Optional catch‑all for other features */
    metadata: z.record(z.any()).optional(),
});

export type Vertex = z.infer<typeof Vertex>;

export const GraphObject = z.object({
    id: z.string(),
    vertices: z.array(Vertex),
    terminalVertices: z.array(z.string()),
    activeVertex: z.string(),
    metadata: z.record(z.any()).optional(),
});

export type GraphObject = z.infer<typeof GraphObject>;

/**
 * Directed acyclic graph representing a conversation.
 */
export class ConversationGraph {
    private vertices = new Map<string, Vertex>();
    public terminalVertices = new Set<string>();
    public activeVertex: string;
    public readonly id: string;

    // initialize the graph with a “root” turn
    constructor(rootMessages: ChatMessage[] = [], id?: string) {
        this.id = id ?? nanoid();
        const root: Vertex = {
            id: this.id,
            messages: rootMessages,
            parents: [],
            children: [],
        };
        this.vertices.set(root.id, root);
        this.terminalVertices.add(root.id);
        this.activeVertex = this.id;
    }

    /**
     * Creates a new vertex branching off one or more existing heads.
     * Returns the new vertex’s ID.
     */
    createVertex(
        newMessages: ChatMessage[],
        parentVertices: string[] = [...this.terminalVertices],
    ): string {
        // validate parents exist
        parentVertices.forEach((vertex) => {
            if (!this.vertices.has(vertex))
                throw new Error(`Parent turn ${vertex} not found`);
        });

        const newVertex: Vertex = {
            id: nanoid(),
            messages: newMessages,
            parents: parentVertices,
            children: [],
        };

        // link parents → child
        parentVertices.forEach((parentID) => {
            const parentVertex = this.vertices.get(parentID)!;
            parentVertex.children.push(newVertex.id);
            this.terminalVertices.delete(parentID);
        });
        this.vertices.set(newVertex.id, newVertex);

        // update head
        this.terminalVertices.add(newVertex.id);
        this.activeVertex = newVertex.id;

        return newVertex.id;
    }

    /**
     * Deletes a vertex and all of its descendants.
     */
    deleteVertex(vertexID: string): void {
        const vertexToDelete = this.vertices.get(vertexID);
        if (!vertexToDelete) return;

        const deletedParents = [...vertexToDelete.parents];

        const trash = new Set<string>();
        const visit = (vertexID: string) => {
            if (trash.has(vertexID) || !this.vertices.has(vertexID)) return;
            trash.add(vertexID);
            this.vertices.get(vertexID)?.children.forEach(visit);
        };
        visit(vertexID);

        let newActiveVertex: string | null = null;
        if (trash.has(this.activeVertex)) {
            const survivingParent = deletedParents.find(
                (parentID) => !trash.has(parentID),
            );
            if (survivingParent) {
                newActiveVertex = survivingParent;
            }
        }

        trash.forEach((vertexID) => {
            const vertex = this.vertices.get(vertexID)!;
            vertex.parents.forEach((parentID) => {
                const parent = this.vertices.get(parentID);
                if (parent && !trash.has(parentID)) {
                    parent.children = parent.children.filter(
                        (child) => child !== vertexID,
                    );
                    if (parent.children.length === 0) {
                        this.terminalVertices.add(parentID);
                    }
                }
            });
            vertex.children.forEach((childID) => {
                const child = this.vertices.get(childID);
                if (child) {
                    child.parents = child.parents.filter(
                        (parent) => parent !== vertexID,
                    );
                }
            });
            this.vertices.delete(vertexID);
            this.terminalVertices.delete(vertexID);
        });

        if (newActiveVertex) {
            this.activeVertex = newActiveVertex;
        } else {
            const terminalVertices = [...this.terminalVertices];
            this.activeVertex = terminalVertices[terminalVertices.length - 1];
        }
    }

    /**
     * Branch off from a specific turn
     */
    branchFrom(vertex: string, messages: ChatMessage[]): string {
        if (!this.vertices.has(vertex))
            throw new Error(`Cannot branch from unknown vertex ${vertex}`);
        return this.createVertex(messages, [vertex]);
    }

    setActiveVertex(vertexID: string): void {
        if (!this.vertices.has(vertexID)) {
            console.warn(
                `Attempted to set non-existent vertex ${vertexID} as active. Keeping current active vertex: ${this.activeVertex}`,
            );
            return;
        }

        this.activeVertex = vertexID;
    }

    /** fetch a turn by ID */
    getVertex(id: string): Vertex | undefined {
        return this.vertices.get(id);
    }

    /** Walks the parents of the given vertex recursively to build the linear history for a given turn */
    getParents(vertex: string): Vertex[] {
        const parents: Vertex[] = [];
        const visit = (vertexID: string) => {
            const vertex = this.vertices.get(vertexID);
            if (!vertex) return;
            vertex.parents.forEach(visit);
            parents.push(vertex);
        };
        visit(vertex);
        return parents;
    }

    /** Walks the children of the given vertex to list all descendant turn‑IDs (useful for UI) */
    getChildren(vertex: string): string[] {
        const children: string[] = [];
        const visit = (turnID: string) => {
            this.vertices.get(turnID)?.children.forEach((childID) => {
                children.push(childID);
                visit(childID);
            });
        };
        visit(vertex);
        return children;
    }

    /** Serialize to the flat array shape the Vercel SDK expects */
    flatten(): ChatMessage[] {
        const path = this.getParents(this.activeVertex);
        return path.flatMap((vertex) => vertex.messages);
    }

    /** Find the leaf vertex furthest down the tree from the given starting vertex using depth-first serach. */
    diveFrom(startVertex: string): string {
        let deepest = startVertex;
        let maxDepth = 0;

        const dfs = (id: string, depth: number) => {
            if (depth > maxDepth) {
                maxDepth = depth;
                deepest = id;
            }

            const vertex = this.vertices.get(id);
            if (!vertex) return;
            for (const child of vertex.children) {
                dfs(child, depth + 1);
            }
        };

        dfs(startVertex, 0);
        return deepest;
    }

    /** Save the entire graph to a JSON‐serializable object */
    save(): GraphObject {
        return {
            id: this.id,
            vertices: Array.from(this.vertices.values()),
            terminalVertices: Array.from(this.terminalVertices),
            activeVertex: this.activeVertex,
            metadata: undefined, // optional
        };
    }

    /** Restore a graph from a previously‐saved snapshot */
    static restore(snapshot: GraphObject) {
        const graph = new ConversationGraph([], snapshot.id);
        graph.vertices.clear();
        graph.terminalVertices.clear();

        for (const vertex of snapshot.vertices) {
            graph.vertices.set(vertex.id, { ...vertex });
        }

        graph.terminalVertices = new Set(snapshot.terminalVertices);

        if (
            snapshot.activeVertex &&
            graph.vertices.has(snapshot.activeVertex)
        ) {
            graph.activeVertex = snapshot.activeVertex;
        } else {
            const terminalVertices = [...graph.terminalVertices];
            graph.activeVertex = terminalVertices[terminalVertices.length - 1];
        }

        return graph;
    }
}
