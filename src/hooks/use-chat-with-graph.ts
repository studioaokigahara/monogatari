import { useCharacterContext } from "@/contexts/character-context";
import { useSettingsContext } from "@/contexts/settings-context";
import { CharacterManager } from "@/database/characters";
import { ChatManager } from "@/database/chats";
import { PromptManager } from "@/database/prompts";
import { useChatSync } from "@/hooks/use-chat-sync";
import { useGraph } from "@/hooks/use-graph";
import { nanoid } from "@/lib/utils";
import { chatStore } from "@/stores/chat-store";
import { useChat } from "@ai-sdk/react";
import { useParams } from "@tanstack/react-router";
import { UIMessage } from "ai";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo } from "react";
import useEvent from "react-use-event-hook";

/**
 * Integrates the Vercel ai-sdk useChat hook with a custom directed acyclic graph (DAG) of messages.
 * While useChat expects a simple linear array of messages, this hook:
 *  - Loads and flattens a graph of message vertices for initial state
 *  - Syncs new messages, edits, and AI responses back into the graph
 *  - Supports branching, sibling navigation, and forking of conversations
 *  - Keeps useChat’s linear interface in sync via the useChatSync “engine”
 *
 * This hook wires together:
 *  - useGraph: manages persistent graph storage and navigation
 *  - useChat: local linear chat state and streaming API
 *  - useChatSync: diff-based synchronization between linear messages and the graph
 *
 * "Why so many useEffects?" - To rerun the associated code when the data changes
 */
export function useChatWithGraph() {
    const { id } = useParams({ strict: false });
    const chatID = id ?? nanoid();
    const { settings } = useSettingsContext();
    const { character, setCharacter, persona } = useCharacterContext();
    const preset = useLiveQuery(() => PromptManager.get(settings.promptSet), [settings.promptSet])

    const graphState = useGraph({ chatID });

    const initialMessages = useMemo(() => {
        return graphState.loaded && graphState.graph
            ? graphState.graph.flatten()
            : undefined;
    }, [graphState.loaded, graphState.graph]);

    const chatState = useChat({
        api: settings.streaming ? "/api/chat" : "/api/chat/completion",
        id: chatID,
        generateId: useCallback(() => nanoid(), [nanoid]),
        initialMessages: initialMessages,
        experimental_prepareRequestBody: useCallback(({ messages }: { messages: UIMessage[] }) => ChatManager.buildRequestBody(messages, character!, persona!, preset!)
        , [character, persona, preset])
    });

    const handleInputChange = useEvent((event) =>
        chatState.handleInputChange(event)
    )

    // Defensive check to prevent a race condition
    // switch chats -> graph changes -> useChat messages[] doesnt update until next render -> sync sees "unsaved messages" -> messages from old chat persisted to new graph
    // so we force reset useChat messages when switching chats to prevent cross-chat contamination, didnt used to need this but current code structure sensitive to timing of react internals
    useEffect(() => {
        if (!graphState.graph || !graphState.loaded) return;

        if (chatState.id !== chatID) {
            const flattenedMessages = graphState.graph.flatten();
            chatState.setMessages(flattenedMessages);
        }
    }, [
        graphState.graph,
        graphState.loaded,
        chatState.id,
        chatID,
        chatState.setMessages
    ]);

    const syncState = useChatSync({
        messages: chatState.messages,
        setMessages: chatState.setMessages,
        status: chatState.status,
        graph: graphState.graph,
        loaded: graphState.loaded,
        chatID: chatID,
        vertexMap: graphState.vertexMap,
        setVertexMap: graphState.setVertexMap,
        saveGraph: graphState.saveGraph,
        title: graphState.title,
        setTitle: graphState.setTitle
    });

    useEffect(() => {
        if (!graphState.loaded) {
            setCharacter(undefined);
            return;
        }

        if (graphState.characterIDs.length === 0) {
            if (character) {
                graphState.setCharacterIDs((prev) =>
                    prev.length === 0 ? [character.id] : prev
                );
            } else {
                setCharacter(undefined);
            }
            return;
        }

        const newCharacter = graphState.characterIDs[0]
        if (character?.id !== newCharacter) {
            CharacterManager
                .get(newCharacter)
                .then(setCharacter);
        }
    }, [
        graphState.loaded,
        graphState.characterIDs,
        character?.id
    ]);

    useEffect(() => {
        chatStore.setState((state) => ({
            ...state,
            // Chat state
            messages: chatState.messages,
            error: chatState.error,
            input: chatState.input,
            status: chatState.status,
            id: chatState.id || "",
            data: chatState.data,

            // Chat actions
            setMessages: chatState.setMessages,
            append: chatState.append,
            reload: chatState.reload,
            stop: chatState.stop,
            setInput: chatState.setInput,
            handleInputChange: handleInputChange,
            handleSubmit: chatState.handleSubmit,
            setData: chatState.setData,
            addToolResult: chatState.addToolResult,

            // Graph state
            graph: graphState.graph,
            vertexMap: graphState.vertexMap,

            // Graph-Sync operations
            branchFrom: syncState.branchFrom,
            deleteVertex: syncState.deleteVertex,
            goToNextSibling: syncState.goToNextSibling,
            goToPreviousSibling: syncState.goToPreviousSibling
        }));
    }, [chatState, graphState, syncState, handleInputChange]);
}
