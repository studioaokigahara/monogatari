import { db } from "@/database/database";
import { PromptManager } from "@/database/prompts";
import { replaceMacros } from "@/lib/curly-braces";
import { nanoid } from "@/lib/utils";
import {
    ConversationGraph,
    type GraphObject,
    type ChatMessage
} from "@/types/conversation-graph";
import type { PromptSet } from "@/database/schema/prompt-set";
import type { CharacterRecord } from "@/database/schema/character";
import type { PersonaRecord } from "@/database/schema/persona";
import { ChatRecord } from "./schema/chat";

/**
 * Centralized manager for all chat graph operations including:
 * - Context building from prompt presets
 * - Graph creation with proper context initialization
 * - Graph persistence (save/load) operations
 *
 * Key features:
 * - Context is built fresh every time to prevent cross-chat contamination
 * - Context is only built during graph creation, not during loading
 */
export class ChatManager {
    /**
     * Ensures the graph has the correct context messages from the preset.
     * Builds fresh context every time to prevent cross-chat contamination.
     *
     * @param graph - The conversation graph to update
     * @param preset - The prompt preset containing context templates
     * @param character - Character data for macro replacement
     * @param persona - Persona data for macro replacement
     * @returns true if context was updated, false if no preset provided
     */
    static ensureContext(
        graph: ConversationGraph,
        preset?: PromptSet,
        character?: CharacterRecord,
        persona?: PersonaRecord
    ): boolean {
        if (!preset) return false;

        // Build fresh context every time
        const contextMessages = PromptManager.buildContext(preset, [])
            .map((message) => ({
                ...message,
                content: replaceMacros(message.content, {
                    character,
                    persona
                })
            }))
            .filter((message) => message.content.trim());

        this.updateGraphContext(graph, contextMessages, preset);

        return true;
    }

    /**
     * Injects context messages into the graph's root vertex.
     * Removes any existing preset context before adding new context to prevent duplication.
     * Preserves user-created system messages (those with IDs starting with 'user-system-').
     *
     * @param graph - The conversation graph to update
     * @param contextMessages - The context messages to inject
     * @param preset - The preset being used (for filtering old context)
     */
    private static updateGraphContext(
        graph: ConversationGraph,
        contextMessages: ChatMessage[],
        preset?: PromptSet
    ) {
        const rootVertex = graph.getVertex(graph.id);
        if (!rootVertex) return;

        // Remove existing preset context (system messages that aren't user-created)
        // Also filter out any messages with preset-based IDs
        const nonContextMessages = rootVertex.messages.filter((msg) => {
            // Keep non-system messages (assistant, user)
            if (msg.role !== "system") return true;

            // Keep user-created system messages
            if (msg.id.startsWith("user-system-")) return true;

            // Remove any system messages with preset-based IDs
            if (msg.id.includes("-") && msg.id.split("-")[0] === preset?.id)
                return false;

            // Remove any system messages with empty/blank IDs (old context)
            if (!msg.id || msg.id.trim() === "") return false;

            return true;
        });

        // Add new context messages at the beginning
        rootVertex.messages = [...contextMessages, ...nonContextMessages];
    }

    /**
     * Creates a new chat graph with proper context initialization.
     * Context is built from the preset and injected into the root vertex.
     * Creates greeting branches from character data.
     *
     * @param character - Character data for greetings and macro replacement
     * @param preset - Prompt preset for context (optional)
     * @param persona - Persona data for macro replacement (optional)
     * @returns A new conversation graph ready for chat
     */
    static createChatGraph(
        character: CharacterRecord,
        preset?: PromptSet,
        persona?: PersonaRecord
    ): ConversationGraph {
        const now = new Date();

        // Build context messages first
        let contextMessages: ChatMessage[] = [];
        if (preset) {
            // Build fresh context every time
            contextMessages = PromptManager.buildContext(preset, [])
                .map((message) => ({
                    ...message,
                    content: replaceMacros(message.content, {
                        character,
                        persona
                    })
                }))
                .filter((message) => message.content.trim());
        }

        const graph = new ConversationGraph(contextMessages);

        const allGreetings = [
            character.data.first_mes,
            ...(character.data.alternate_greetings || [])
        ];

        let firstGreetingVertexID: string | undefined;
        allGreetings.forEach((greeting, index) => {
            const greetingMessage: ChatMessage = {
                id: `greeting-${index + 1}-${nanoid()}`,
                role: "assistant",
                content: replaceMacros(greeting, { character }),
                createdAt: now
            };

            const newVertexID = graph.branchFrom(graph.id, [greetingMessage]);
            if (index === 0) {
                firstGreetingVertexID = newVertexID;
            }
        });

        if (!firstGreetingVertexID) {
            throw new Error("Failed to create greeting vertex");
        }

        graph.setActiveVertex(firstGreetingVertexID);
        return graph;
    }

    /**
     * Saves a conversation graph to the database.
     * Preserves creation timestamp and updates modification timestamp.
     *
     * @param graph - The conversation graph to save
     * @param characterIDs - Array of character IDs associated with this chat
     * @param title - Optional chat title
     */
    static async saveGraph(
        graph: ConversationGraph,
        characterIDs: string[],
        title?: string
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
            updatedAt: now
        };

        await db.chats.put(record);
    }

    /**
     * Loads a conversation graph from the database.
     *
     * @param chatID - The ID of the chat to load
     * @returns The restored conversation graph, or undefined if not found
     */
    static async loadGraph(
        chatID: string
    ): Promise<{ graph: ConversationGraph; record: ChatRecord } | undefined> {
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
                updatedAt: record.updatedAt
            }
        };
        const graph = ConversationGraph.restore(graphObject);
        return { graph, record };
    }

    /**
     * Updates the title of an existing chat in the database.
     *
     * @param chatID - The ID of the chat to update
     * @param title - The new title for the chat
     */
    static async updateGraph(chatID: string, title: string) {
        const existing = await db.chats.get(chatID);
        if (!existing) return;

        await db.chats.update(chatID, {
            title: title,
            updatedAt: new Date()
        });
    }

    /**
    * Deletes a chat and its associated data from the database.
    *
    * @param id - The ID of the chat to delete
    */
    static async deleteChat(id: string) {
        await db.chats.delete(id);
    }

    /**
     * Lists all chats in the database, ordered by most recently updated first.
     *
     * @returns Array of chat records sorted by update time (newest first)
     */
    static async listAllChats() {
        return db.chats.orderBy("updatedAt").reverse().toArray();
    }
}
