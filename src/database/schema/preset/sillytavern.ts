import { generateCuid2 } from "@/lib/utils";
import z from "zod";
import { Prompt } from "../preset";

const SillyTavernPrompt = z.object({
    name: z.string(),
    system_prompt: z.boolean(), // true if sillytavern marker for context building
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
    identifier: z.string(),
    injection_position: z.union([z.literal(0), z.literal(1)]), // 0 = “relative” (array order), 1 = “absolute”
    injection_depth: z.number(),
    injection_order: z.number().max(10_000), // priority, default 100, max 10 000
    enabled: z.boolean().optional()
});
type SillyTavernPrompt = z.infer<typeof SillyTavernPrompt>;

const SillyTavernOrder = z.object({
    character_id: z.string(),
    order: z.array(
        z.object({
            identifier: z.string(),
            enabled: z.boolean()
        })
    )
});
type SillyTavernOrder = z.infer<typeof SillyTavernOrder>;

const SillyTavernPreset = z.object({
    prompts: z.array(SillyTavernPrompt),
    prompt_order: z.array(SillyTavernOrder)
});
type SillyTavernPreset = z.infer<typeof SillyTavernPreset>;

export const SillyTavernPresetConverter = SillyTavernPreset.transform(
    (preset) => {
        const promptMap = new Map<string, SillyTavernPrompt>();

        (preset.prompts || []).forEach((prompt: SillyTavernPrompt) => {
            if (prompt.content?.trim() || prompt.system_prompt)
                promptMap.set(prompt.identifier, prompt);
        });

        const listOrder: SillyTavernOrder["order"] =
            preset.prompt_order?.find?.(
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
            personaDescription: "{{user.description}}",
            worldInfoBefore: "{{lorebook.before}}",
            worldInfoAfter: "{{lorebook.after}}"
        };

        const fieldsToSkip = new Set([
            "chatHistory",
            "enhanceDefinitions",
            "nsfw"
        ]);

        listOrder.forEach((item) => {
            const prompt = promptMap.get(item.identifier);
            if (!prompt || fieldsToSkip.has(prompt.identifier)) return;

            let content = prompt.content?.trim();
            const macro = fieldsToConvert[prompt.identifier];
            const commentRegex = /^\{\{\/\/\s.*?\s\}\}(\{\{trim\}\})?$/;

            let contentEmpty = !content || commentRegex.test(content);

            const createMessage = (content: string) => ({
                id: generateCuid2(),
                name: prompt.name,
                role: prompt.role ?? ("system" as const),
                content,
                enabled: item.enabled,
                position:
                    listOrder.findIndex(
                        (o) => o.identifier === item.identifier
                    ) >
                    listOrder.findIndex((o) => o.identifier === "chatHistory")
                        ? ("after" as const)
                        : prompt.injection_position === 1
                          ? ("after" as const)
                          : ("before" as const),
                depth:
                    prompt.injection_position === 0
                        ? 0
                        : (prompt.injection_depth ?? 0)
            });

            if (macro) {
                if (contentEmpty) {
                    messages.push(createMessage(macro));
                } else {
                    messages.push(createMessage(content!));
                    messages.push(createMessage(macro));
                }
            } else if (!contentEmpty) {
                messages.push(createMessage(content!));
            }

            promptMap.delete(item.identifier);
        });

        return {
            id: generateCuid2(),
            name: "Imported preset",
            description: "Imported from SillyTavern",
            prompts: messages,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
);
