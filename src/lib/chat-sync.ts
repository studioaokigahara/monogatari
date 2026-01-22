import { Chat } from "@/database/schema/chat";
import { type Message } from "@/types/message";
import { type Settings } from "@/types/settings";

const DEFAULT_SIBLING_COUNT = { current: 1, total: 1 };

export class ChatSyncAdapter {
    public readonly id: string;
    public readonly settings: Settings;
    public readonly chat: Chat;

    private titleGenerated = false;
    private pendingMessages: Message[] | null = null;
    private listeners = new Set<() => void>();
    private siblingCountCache = new Map<string, { current: number; total: number }>();

    private constructor(id: string, settings: Settings, chat: Chat) {
        this.id = id;
        this.settings = settings;
        this.chat = chat;
        this.titleGenerated = Boolean(chat.title);
    }

    static async create(id: string, settings: Settings) {
        const chat = await Chat.load(id);
        return new ChatSyncAdapter(id, settings, chat);
    }

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    private notify() {
        this.siblingCountCache.clear();
        for (const listener of this.listeners) listener();
    }

    private async generateTitle(messages: Message[]) {
        try {
            const messageText = messages
                .map((message) => {
                    const text = message.parts.find((part) => part.type === "text")?.text;
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
        const pendingMessages = messages.filter((message) => message.parts.length > 0);

        let sliceStart = pendingMessages.length;
        for (let i = pendingMessages.length - 1; i >= 0; --i) {
            if (this.chat.getVertex(pendingMessages[i].id)) {
                sliceStart = i + 1;
                break;
            }
        }

        const unsavedMessages = pendingMessages.slice(sliceStart);
        if (unsavedMessages.length === 0) return;

        for (const message of unsavedMessages) {
            this.chat.createVertex(this.chat.activeVertex, message);
        }

        if (!this.titleGenerated && Math.random() > 0.5) {
            const title = await this.generateTitle(messages);
            if (title) {
                this.titleGenerated = true;
                await this.chat.updateTitle(title);
            }
        }

        await this.chat.save();
        this.notify();
    }

    async commitOnFinish(latest: Message) {
        const pendingMessages = this.pendingMessages ?? [];
        const full = [...pendingMessages, latest];
        await this.commit(full);
        this.pendingMessages = null;
    }

    async deleteMessage(messageID: string) {
        this.chat.deleteVertex(messageID);
        await this.chat.save();
        this.notify();
    }

    setBranchPoint(id: string): void {
        this.chat.setActiveVertex(id, false);
    }

    selectBranch(messageID: string, offset: number) {
        const sibling = this.chat.getTargetSibling(messageID, offset);
        if (!sibling) return;

        this.chat.setActiveVertex(sibling, true);
        this.notify();

        return this.chat.flatten();
    }

    async updateMessage(message: Message) {
        this.chat.updateVertex(message);
        await this.chat.save();
        this.notify();
    }

    getSiblingCount = (messageID: string) => {
        const cached = this.siblingCountCache.get(messageID);
        if (cached) return cached;

        const parentID = this.chat.getVertex(messageID)?.parent;
        if (!parentID) {
            this.siblingCountCache.set(messageID, DEFAULT_SIBLING_COUNT);
            return DEFAULT_SIBLING_COUNT;
        }

        const siblings = this.chat.getVertex(parentID)?.children ?? [];
        if (siblings.length === 0) {
            this.siblingCountCache.set(messageID, DEFAULT_SIBLING_COUNT);
            return DEFAULT_SIBLING_COUNT;
        }

        const actualIndex = siblings.indexOf(messageID);
        if (actualIndex === -1) {
            this.siblingCountCache.set(messageID, DEFAULT_SIBLING_COUNT);
            return DEFAULT_SIBLING_COUNT;
        }

        const siblingCount = {
            current: actualIndex + 1,
            total: siblings.length
        };

        this.siblingCountCache.set(messageID, siblingCount);
        return siblingCount;
    };
}
