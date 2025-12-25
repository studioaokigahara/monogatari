import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import { Chat } from "@ai-sdk/react";
import type { Message } from "@/types/message";
import { DefaultChatTransport } from "ai";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "@tanstack/react-router";
import { useCharacterContext } from "./character-context";
import { useSettingsContext } from "./settings-context";
import { Character } from "@/database/schema/character";
import { GraphSyncManager } from "@/lib/graph/sync";
import { Settings } from "@/types/settings";
import { Persona } from "@/database/schema/persona";
import { Preset } from "@/database/schema/preset";
import { buildContext } from "@/lib/build-context";
import { Spinner } from "@/components/ui/spinner";
import { db } from "@/database/database";
import { toast } from "sonner";

interface Dependencies {
    settings: Settings;
    character: Character;
    persona: Persona;
    preset: Preset;
}

interface ChatContextValue {
    graphSync: GraphSyncManager;
    chat: Chat<Message>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettingsContext();
    const { character, setCharacter, persona } = useCharacterContext();

    const preset = useLiveQuery(
        () => db.presets.get(settings.preset),
        [settings.preset]
    );

    const { id } = useParams({ from: "/chat/$id" });

    const dependencyRef = useRef<Dependencies | null>(null);
    if (character && persona && preset) {
        dependencyRef.current = { settings, character, persona, preset };
    }

    const buildRequestBody = useCallback(
        async (messages: Message[]) => {
            if (!dependencyRef.current) {
                throw new Error("Chat instance not fully initialized.");
            }

            const { settings, character, persona, preset } =
                dependencyRef.current;

            const context = await buildContext(
                id,
                messages,
                preset,
                character,
                persona
            );

            return {
                body: { messages: context, settings }
            };
        },
        [id]
    );

    const [chatState, setChatState] = useState<ChatContextValue>();

    useEffect(() => {
        const abortController = new AbortController();

        const initializeChat = async () => {
            const graphSync = await GraphSyncManager.create(id, settings);

            if (abortController.signal.aborted) return;

            const characterIDs = graphSync.characterIDs;
            if (characterIDs.length > 0) {
                const chatCharacters = await Promise.all(
                    characterIDs.map((id) => Character.load(id))
                );
                if (abortController.signal.aborted) return;
                setCharacter(chatCharacters[0]);
            }

            const chat = new Chat<Message>({
                transport: new DefaultChatTransport({
                    api: settings.streaming
                        ? "/api/chat"
                        : "/api/chat/completions",
                    headers: {
                        "HTTP-Referer": "http://localhost",
                        "X-Title": "Monogatari"
                    },
                    prepareSendMessagesRequest: async ({ messages }) => {
                        graphSync.setPendingMessages(messages);
                        await graphSync.commit(messages);
                        return buildRequestBody(messages);
                    }
                }),
                id,
                messages: graphSync.getInitialMessages(),
                onFinish: async ({ message }) => {
                    await graphSync.commitOnFinish(message);
                },
                onError: (error: Error) => {
                    toast.error("Failed to stream message", {
                        description: error.message
                    });
                }
            });

            if (abortController.signal.aborted) return;

            setChatState({ graphSync, chat });
        };

        initializeChat();

        return () => {
            abortController.abort();
            setChatState(undefined);
        };
    }, [setCharacter, id, settings, buildRequestBody]);

    if (!chatState) {
        return (
            <div className="h-full flex shrink-0 mx-auto">
                <div className="flex flex-row grow my-auto gap-1">
                    <Spinner className="size-6" />
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <ChatContext.Provider value={chatState}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within ChatProvider.");
    }
    return context;
}
