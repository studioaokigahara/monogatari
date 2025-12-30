import { Chat } from "@/database/schema/chat";
import { ChatGraph } from "@/lib/graph";
import { type Message } from "@/types/message";
import { type Settings } from "@/types/settings";

export class GraphSyncManager {
    public readonly id: string;
    public readonly settings: Settings;
    public readonly graph = new ChatGraph();
    public readonly characterIDs: string[] = [];
    public readonly vertexMap = new Map<string, string>();
    public readonly title?: string;

    private workingVertex: string | null = null;
    private titleGenerated = false;
    private pendingMessages: Message[] | null = null;

    private constructor(
        id: string,
        settings: Settings,
        graph: ChatGraph,
        characterIDs: string[],
        vertexMap: Map<string, string>,
        title?: string
    ) {
        this.id = id;
        this.settings = settings;
        this.graph = graph;
        this.characterIDs = characterIDs;
        this.vertexMap = vertexMap;
        this.title = title;
        this.titleGenerated = Boolean(title);
    }

    static async create(id: string, settings: Settings) {
        const { record, graph } = await Chat.load(id);

        const vertexMap = new Map<string, string>();
        for (const vertex of graph.save().vertices) {
            for (const message of vertex.messages) {
                vertexMap.set(message.id, vertex.id);
            }
        }

        return new GraphSyncManager(
            id,
            settings,
            graph,
            record.characterIDs,
            vertexMap,
            record.title
        );
    }

    private async persist(options?: { ids?: string[]; title?: string }) {
        await Chat.saveGraph(
            this.graph,
            options?.ids ?? this.characterIDs,
            options?.title ?? this.title
        );
    }

    getInitialMessages() {
        return this.graph.flatten();
    }

    async setCharacterIDs(ids: string[]) {
        await this.persist({ ids });
    }

    private async generateTitle(messages: Message[]) {
        try {
            const messageText = messages
                .map((message) => {
                    const text = message.parts.find(
                        (part) => part.type === "text"
                    )?.text;
                    return text ? `${message.role}: ${text}` : null;
                })
                .filter((message) => message !== null)
                .join("\n\n");

            const response = await fetch("/api/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            parts: [
                                {
                                    type: "text",
                                    text: `Create an unexpected, thematic title for this conversation in less than 4 words. Do not merely summarize what's happening:\n<messages>\n${messageText}\n</messages>`
                                }
                            ]
                        }
                    ],
                    settings: this.settings
                })
            });

            const generatedTitle = (await response.text())
                .replace(/^["']|["']$/g, "")
                .replaceAll("*", "")
                .replaceAll("#", "")
                .split(":")[0]
                .trim();

            if (generatedTitle.endsWith("<!-- oai-proxy-error -->")) {
                throw new Error("Proxy returned error");
            }

            return generatedTitle;
        } catch (error) {
            console.error("Title generation failed:", error);
            return undefined;
        }
    }

    setPendingMessages(messages: Message[]) {
        this.pendingMessages = [...messages];
    }

    async commit(messages: Message[]) {
        const pendingMessages = messages.filter(
            (message) => message.parts.length > 0
        );

        let sliceStart = pendingMessages.length;
        for (let i = pendingMessages.length - 1; i >= 0; i--) {
            if (this.vertexMap.has(pendingMessages[i].id)) {
                sliceStart = i + 1;
                break;
            }
        }

        const unsavedMessages = pendingMessages.slice(sliceStart);
        if (unsavedMessages.length === 0 && !this.workingVertex) return;

        let currentVertex = this.workingVertex ?? this.graph.activeVertex;
        this.workingVertex = null;

        for (const message of unsavedMessages) {
            currentVertex = this.graph.createVertex(currentVertex, [message]);
            this.vertexMap.set(message.id, currentVertex);
        }

        if (!this.titleGenerated && Math.random() > 0.5) {
            const title = await this.generateTitle(messages);
            if (title) {
                this.titleGenerated = true;
                await this.persist({ title });
                return;
            }
        }

        await this.persist();
    }

    async commitOnFinish(latest: Message) {
        const pendingMessages = this.pendingMessages ?? [];
        const full = [...pendingMessages, latest];
        await this.commit(full);
        this.pendingMessages = null;
    }

    async deleteVertex(vertexID: string) {
        this.graph.deleteVertex(vertexID);
        await this.persist();
    }

    setBranchPoint(id: string): void {
        this.workingVertex = id;
        this.graph.activeVertex = id;
    }

    selectBranch(messages: Message[], messageID: string, offset: number) {
        const vertexID = this.vertexMap.get(messageID);
        if (!vertexID) return;

        const target = this.graph.getTargetSibling(vertexID, offset);
        if (!target) return;

        const currentPath = this.graph.getParents(this.graph.activeVertex);
        const targetPath = this.graph.getParents(target.leafID);

        let commonAncestorIndex = -1;
        const minLength = Math.min(currentPath.length, targetPath.length);
        for (let i = 0; i < minLength; i++) {
            if (currentPath[i].id !== targetPath[i].id) break;
            commonAncestorIndex = i;
        }

        let prefixLength = 0;
        for (let i = 0; i <= commonAncestorIndex; i++) {
            prefixLength += currentPath[i].messages.length;
        }

        const suffix = targetPath
            .slice(commonAncestorIndex + 1)
            .flatMap((vertex) => vertex.messages);

        this.graph.activeVertex = target.leafID;

        return [...messages.slice(0, prefixLength), ...suffix];
    }

    async updateMessage(message: Message) {
        const vertexID = this.vertexMap.get(message.id);
        if (!vertexID) {
            throw new Error("Message ID not in vertex map");
        }

        const vertex = this.graph.getVertex(vertexID);
        if (!vertex) {
            throw new Error(`Vertex ${vertexID} does not exist in graph`);
        }

        const index = vertex.messages.findIndex((m) => m.id === message.id);
        if (index === -1) {
            throw new Error(
                "Unable to get message index, message ID not in vertex messages array"
            );
        }

        vertex.messages[index] = message;
        await this.persist();
    }

    getSiblingCount(messageID: string) {
        const fallback = { current: 1, total: 1 };

        const currentID = this.vertexMap.get(messageID);
        if (!currentID) return fallback;

        const parentID = this.graph.getVertex(currentID)?.parent;
        if (!parentID) return fallback;

        const siblings = this.graph.getVertex(parentID)?.children ?? [];
        if (siblings.length === 0) return fallback;

        const actualIndex = siblings.indexOf(currentID);
        if (actualIndex === -1) return fallback;

        return {
            current: actualIndex + 1,
            total: siblings.length
        };
    }
}
