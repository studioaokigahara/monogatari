import { Spinner } from "@/components/ui/spinner";
import { useCharacterContext } from "@/contexts/character";
import { ChatContext } from "@/contexts/chat";
import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { Preset } from "@/database/schema/preset";
import { useSettings } from "@/hooks/use-settings";
import { buildContext } from "@/lib/build-context";
import { ChatSyncAdapter } from "@/lib/chat-sync";
import type { Message } from "@/types/message";
import { Settings } from "@/types/settings";
import { Chat } from "@ai-sdk/react";
import { useParams } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { useLiveQuery } from "dexie-react-hooks";
import { ContextType, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Dependencies {
    settings: Settings;
    character: Character;
    persona: Persona;
    preset: Preset;
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const { character, setCharacter, persona } = useCharacterContext();

    const preset = useLiveQuery(() => db.presets.get(settings.preset), [settings.preset]);

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

            const { settings, character, persona, preset } = dependencyRef.current;

            const context = await buildContext(id, messages, preset, character, persona);

            return {
                body: { messages: context, settings }
            };
        },
        [id]
    );

    const [chatState, setChatState] = useState<ContextType<typeof ChatContext>>();

    useEffect(() => {
        const abortController = new AbortController();

        const initializeChat = async () => {
            const chatSync = await ChatSyncAdapter.create(id, settings);

            if (abortController.signal.aborted) return;

            const characterIDs = chatSync.chat.characterIDs;
            if (characterIDs.length > 0) {
                const chatCharacters = await Promise.all(
                    characterIDs.map((id) => Character.load(id))
                );
                if (abortController.signal.aborted) return;
                setCharacter(chatCharacters[0]);
            }

            const chat = new Chat<Message>({
                transport: new DefaultChatTransport({
                    api: settings.streaming ? "/api/chat" : "/api/chat/completions",
                    headers: {
                        "HTTP-Referer": "http://localhost",
                        "X-Title": "Monogatari"
                    },
                    prepareSendMessagesRequest: async ({ messages }) => {
                        chatSync.setPendingMessages(messages);
                        await chatSync.commit(messages);
                        return buildRequestBody(messages);
                    }
                }),
                id,
                messages: chatSync.chat.flatten(),
                onFinish: async ({ message }) => {
                    await chatSync.commitOnFinish(message);
                },
                onError: (error: Error) => {
                    toast.error("Failed to stream message", {
                        description: error.message
                    });
                }
            });

            if (abortController.signal.aborted) return;

            setChatState({ chat, chatSync });
        };

        void initializeChat();

        return () => {
            abortController.abort();
            setChatState(undefined);
        };
    }, [setCharacter, id, settings, buildRequestBody]);

    if (!chatState) {
        return (
            <div className="mx-auto flex h-full shrink-0">
                <div className="my-auto flex grow flex-row gap-1">
                    <Spinner className="size-6" />
                    Loading...
                </div>
            </div>
        );
    }

    return <ChatContext.Provider value={chatState}>{children}</ChatContext.Provider>;
}
