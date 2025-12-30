import { generateCuid2 } from "@/lib/utils";
import { Message } from "@/types/message";
import { z } from "zod";

/**
 * A single “turn” in the conversation graph:
 *  - 'messages' is an ordered batch of messages sent/received in that turn
 *  - a turn can have multiple children (branching) but only one parent
 */
export const Vertex = z.object({
    /** unique identifier */
    id: z.string(),
    /** The messages in this turn */
    messages: z.array(Message),
    /** Upstream turn the current turn descends from */
    parent: z.string().nullable(),
    /** Downstream turns (branches) that continue from this turn */
    children: z.array(z.string())
});
export type Vertex = z.infer<typeof Vertex>;

export const GraphSnapshot = z.object({
    id: z.string(),
    vertices: z.array(Vertex),
    activeVertex: z.string(),
    activeTerminalVertices: z.record(z.string(), z.string()),
    metadata: z.record(z.string(), z.any()).optional()
});
export type GraphSnapshot = z.infer<typeof GraphSnapshot>;

/**
 * Directed acyclic graph representing a chat.
 */
export class ChatGraph {
    public readonly id: string;
    private vertices = new Map<string, Vertex>();
    private activeTerminalVertices = new Map<string, string>();
    #activeVertex: string;

    constructor(
        id?: string,
        vertices?: Map<string, Vertex>,
        activeVertex?: string,
        activeTerminalVertices?: Map<string, string>
    ) {
        this.id = id ?? generateCuid2();

        const root: Vertex = {
            id: this.id,
            messages: [],
            parent: null,
            children: []
        };

        if (vertices) {
            this.vertices = vertices;
        } else {
            this.vertices.set(root.id, root);
        }

        this.#activeVertex = activeVertex ?? this.id;

        if (activeTerminalVertices) {
            this.activeTerminalVertices = activeTerminalVertices;
        }
    }

    /** Serialize the graph into a JSON-compatible object */
    save(): GraphSnapshot {
        return {
            id: this.id,
            vertices: Array.from(this.vertices.values()),
            activeVertex: this.#activeVertex,
            activeTerminalVertices: Object.fromEntries(
                this.activeTerminalVertices
            ),
            metadata: undefined // optional
        };
    }

    /** Restore a graph from a previously‐saved snapshot */
    static load(snapshot: GraphSnapshot) {
        const vertices = new Map(
            snapshot.vertices.map((vertex) => [vertex.id, vertex])
        );

        const activeVertex = vertices.has(snapshot.activeVertex)
            ? snapshot.activeVertex
            : snapshot.id;

        const activeTerminalVertices = new Map(
            Object.entries(snapshot.activeTerminalVertices)
        );

        return new ChatGraph(
            snapshot.id,
            vertices,
            activeVertex,
            activeTerminalVertices
        );
    }

    get activeVertex() {
        return this.#activeVertex;
    }

    set activeVertex(id: string) {
        if (!this.vertices.has(id)) {
            console.warn(
                `Attempted to set non-existent vertex ${id} as active. Keeping current active vertex: ${this.#activeVertex}`
            );
            return;
        }

        this.#activeVertex = id;
        this.updateActiveTerminalVertices(id);
    }

    private updateActiveTerminalVertices(vertexID: string) {
        const path = this.getParents(vertexID);
        for (let i = 0; i < path.length - 1; i++) {
            const parent = path[i];
            if (parent.children.length > 1) {
                const child = path[i + 1].id;
                this.activeTerminalVertices.set(child, vertexID);
            }
        }
    }

    /**
     * Creates a new vertex branching off one or more existing heads.
     * Returns the new vertex’s ID.
     */
    createVertex(parentID: string, messages: Message[]): string {
        const parent = this.vertices.get(parentID);
        if (!parent) {
            throw new Error(`Parent turn ${parentID} not found.`);
        }

        const newVertex: Vertex = {
            id: generateCuid2(),
            messages,
            parent: parentID,
            children: []
        };

        parent.children.push(newVertex.id);
        this.vertices.set(newVertex.id, newVertex);
        this.activeVertex = newVertex.id;

        return newVertex.id;
    }

    /**
     * Deletes a vertex and all of its descendants.
     */
    deleteVertex(vertexID: string): void {
        const vertexToDelete = this.vertices.get(vertexID);
        if (!vertexToDelete) return;

        const deletedParent = vertexToDelete.parent;

        const trash = new Set<string>();
        const visit = (vertexID: string) => {
            if (trash.has(vertexID) || !this.vertices.has(vertexID)) return;
            trash.add(vertexID);
            this.vertices.get(vertexID)?.children.forEach(visit);
        };
        visit(vertexID);

        let newActiveVertex: string | null = null;
        if (
            trash.has(this.activeVertex) &&
            deletedParent &&
            !trash.has(deletedParent)
        ) {
            const parent = this.vertices.get(deletedParent);
            if (parent) {
                const index = parent.children.indexOf(vertexID);
                const siblings = parent.children.filter(
                    (child) => child !== vertexID
                );
                if (siblings.length > 0) {
                    newActiveVertex =
                        siblings[Math.min(index, siblings.length - 1)];
                } else {
                    newActiveVertex = deletedParent;
                }
            }
        }

        for (const vertexID of trash) {
            const vertex = this.vertices.get(vertexID)!;
            if (vertex.parent) {
                const parent = this.vertices.get(vertex.parent);
                if (parent && !trash.has(parent.id)) {
                    parent.children = parent.children.filter(
                        (child) => child !== vertexID
                    );
                }
            }
            this.vertices.delete(vertexID);
            this.activeTerminalVertices.delete(vertexID);
        }

        for (const [key, value] of this.activeTerminalVertices) {
            if (trash.has(value)) this.activeTerminalVertices.delete(key);
        }

        this.activeVertex = newActiveVertex ?? this.id;
    }

    /** fetch a turn by ID */
    getVertex(id: string): Vertex | undefined {
        return this.vertices.get(id);
    }

    /** Walks the parents of the given vertex recursively to build the linear history for a given turn */
    getParents(id: string): Vertex[] {
        const parents: Vertex[] = [];

        let current = this.vertices.get(id);
        while (current) {
            parents.unshift(current);
            current = current.parent
                ? this.vertices.get(current.parent)
                : undefined;
        }

        return parents;
    }

    /** Walks the children of the given vertex to list all descendant turn‑IDs (useful for UI) */
    getChildren(vertex: string): string[] {
        const children: string[] = [];

        const visit = (id: string) => {
            const vertex = this.vertices.get(id);
            if (!vertex) return;
            for (const childID of vertex.children) {
                children.push(childID);
                visit(childID);
            }
        };
        visit(vertex);

        return children;
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

            const vertex = this.vertices.get(id);
            if (!vertex) return;
            for (const child of vertex.children) {
                dfs(child, depth + 1);
            }
        };

        dfs(startVertex, 0);
        return deepest;
    }

    flatten(): Message[] {
        const path = this.getParents(this.activeVertex);
        return path.flatMap((vertex) => vertex.messages);
    }

    getTargetSibling(vertexID: string, offset: number) {
        const vertex = this.vertices.get(vertexID);
        if (!vertex || !vertex.parent) return;

        const parent = this.vertices.get(vertex.parent);
        if (!parent || parent.children.length < 2) return;

        const siblings = parent.children;
        const currentIndex = siblings.indexOf(vertexID);
        const newIndex =
            (currentIndex + offset + siblings.length) % siblings.length;
        const siblingID = siblings[newIndex];

        const lastActiveSibling = this.activeTerminalVertices.get(siblingID);
        const leafID = lastActiveSibling
            ? lastActiveSibling
            : this.getDeepestChild(siblingID);

        return { siblingID, leafID };
    }
}
