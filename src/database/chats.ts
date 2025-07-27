import { db } from "@/database/database";
import { PromptManager } from "@/database/prompts";
import type { CharacterRecord } from "@/database/schema/character";
import { ChatRecord } from "@/database/schema/chat";
import type { PersonaRecord } from "@/database/schema/persona";
import type { PromptSet } from "@/database/schema/prompt-set";
import { replaceMacros } from "@/lib/curly-braces";
import { nanoid } from "@/lib/utils";
import {
    ConversationGraph,
    type ChatMessage,
    type GraphObject
} from "@/types/conversation-graph";
import { UIMessage } from "ai";

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
        character: CharacterRecord
    ): ConversationGraph {
        const now = new Date();

        const graph = new ConversationGraph();

        const greetings = [
            character.data.first_mes,
            ...(character.data.alternate_greetings || [])
        ];

        let firstGreetingVertexID: string | undefined;
        greetings.forEach((greeting, index) => {
            const greetingMessage: ChatMessage = {
                id: `greeting-${index + 1}-${nanoid()}`,
                role: "assistant",
                content: greeting,
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

    static buildRequestBody(
        messages: UIMessage[],
        character: CharacterRecord,
        persona: PersonaRecord,
        preset: PromptSet,
    ) {
        const history = messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            createdAt: m.createdAt ?? new Date()
        }));

        const context = PromptManager.buildContext(preset, history)
            .map((message) => ({
                ...message,
                content: replaceMacros(message.content, {
                    character,
                    persona
                })
            }))
            .filter((message) => message.content.trim());

        return {
            messages: context
        }
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
