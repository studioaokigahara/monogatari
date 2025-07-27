import { db } from "@/database/database";
import { type PromptSet, Prompt } from "@/database/schema/prompt-set";
import { nanoid } from "@/lib/utils";
import { ChatMessage } from "@/types/conversation-graph";

interface STPrompt {
    role: "system" | "user" | "assistant";
    name: string;
    injection_depth: number; // 0,1,2…
    injection_position?: 0 | 1; // 0 = “relative” (array order) , 1 = “absolute”
    injection_order?: number; // priority, default 100, max 10 000
    enabled?: boolean;
    content: string;
}

export class PromptManager {
    static async list(): Promise<PromptSet[]> {
        return db.promptSets.orderBy("updatedAt").reverse().toArray();
    }

    static async get(id: string): Promise<PromptSet | undefined> {
        return db.promptSets.get(id);
    }

    static async save(set: PromptSet) {
        set.updatedAt = new Date();
        if (!set.id) set.id = nanoid();
        return db.promptSets.put(set);
    }

    static async delete(id: string) {
        return db.promptSets.delete(id);
    }

    static buildContext(
        preset: PromptSet | undefined,
        history: ChatMessage[]
    ): ChatMessage[] {
        if (!preset) return history;

        const enabledMessages = preset.messages.filter((m) => m.enabled);

        const before = enabledMessages
            .filter((m) => m.position === "before")
            .map((m) => ({
                id: m.id ?? nanoid(),
                role: m.role,
                content: m.content,
                createdAt: new Date()
            }));

        enabledMessages
            .filter((m) => m.position === "after")
            .sort((a, b) => b.depth - a.depth)
            .forEach((m) => {
                const position = Math.max(history.length - m.depth, 0);
                const msg = {
                    id: m.id ?? nanoid(),
                    role: m.role,
                    content: m.content,
                    createdAt: new Date()
                };
                history.splice(position, 0, msg);
            });

        return [...before, ...history];
    }

    static fromSilly(st: any): PromptSet {
        console.log(st);
        const promptMap = new Map<string, STPrompt>();

        (st.prompts || []).forEach((p: STPrompt) => {
            if (p.content?.trim() || p.system_prompt)
                promptMap.set(p.identifier, p);
        });

        const listOrder: { id: string; enabled: boolean }[] =
            st.prompt_order?.find?.(
                (order) => String(order.character_id) === "100001"
            )?.order ?? [];
        const messages: Prompt[] = [];

        const fieldsToConvert: Record<string, string> = {
            main: "{{char.system_prompt}}",
            charDescription: "{{char.description}}",
            charPersonality: "{{char.personality}}",
            dialogueExamples: "{{char.mes_example}}",
            scenario: "{{char.scenario}}",
            jailbreak: "{{char.post_history_instructions}}",
            personaDescription: "{{user.description}}"
        };

        const fieldsToSkip: string[] = [
            "worldInfoBefore",
            "worldInfoAfter",
            "chatHistory",
            "enhanceDefinitions",
            "nsfw"
        ];

        listOrder.forEach((item) => {
            const prompt = promptMap.get(item.identifier);
            if (!prompt || fieldsToSkip.includes(prompt.identifier)) return;

            let content = prompt.content?.trim();
            if (fieldsToConvert[prompt.identifier]) {
                content = fieldsToConvert[prompt.identifier];
            }

            messages.push({
                id: nanoid(),
                name: prompt.name,
                role: prompt.role ?? ("system" as const),
                content,
                position:
                    prompt.injection_position === 1
                        ? ("after" as const)
                        : ("before" as const),
                enabled: item.enabled === true,
                depth:
                    prompt.injection_position === 0
                        ? 0
                        : (prompt.injection_depth ?? 0)
            });
            promptMap.delete(item.identifier);
        });

        return {
            id: nanoid(),
            name: st.name ?? "Imported preset",
            description: "Imported from SillyTavern",
            messages,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    static toSilly(set: PromptSet): any {
        const out: any = {
            name: set.name,
            wrap_in_quotes: false,
            send_if_empty: false,
            prompts: []
        };

        set.messages.forEach((m) => {
            out.prompts.push({
                identifier: m.id,
                name: m.id,
                role: m.role,
                content: m.content,
                enabled: m.enabled,
                injection_position: m.position === "before" ? 0 : 1,
                injection_depth: m.depth ?? 0,
                injection_order: 100
            });
        });

        return out;
    }
}
