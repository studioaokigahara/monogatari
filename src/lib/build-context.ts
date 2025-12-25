import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import { Preset } from "@/database/schema/preset";
import { type Message } from "@/types/message";
import { generateCuid2 } from "./utils";
import { MatchContext, LorebookMatcher } from "./lorebook/matcher";
import { DecoratorParser } from "./lorebook/decorator";
import { replaceMacros } from "./curly-braces";
import { db } from "@/database/database";
import { Lorebook } from "@/database/schema/lorebook";
import { Tiktoken } from "tiktoken/lite";
import o200k_base from "tiktoken/encoders/o200k_base";

function buildPresetContext(messages: Message[], preset: Preset) {
    const enabledMessages = preset.prompts.filter((message) => message.enabled);

    const before: Message[] = enabledMessages
        .filter((message) => message.position === "before")
        .map((message) => ({
            id: message.id ?? generateCuid2(),
            role: message.role,
            parts: [{ type: "text", text: message.content }],
            metadata: { createdAt: new Date() }
        }));

    const after = [...messages];
    enabledMessages
        .filter((message) => message.position === "after")
        .sort((a, b) => b.depth - a.depth)
        .forEach((message) => {
            const index = Math.max(after.length - message.depth, 0);
            const newMessage: Message = {
                id: message.id ?? generateCuid2(),
                role: message.role,
                parts: [{ type: "text", text: message.content }],
                metadata: { createdAt: new Date() }
            };
            after.splice(index, 0, newMessage);
        });

    return [...before, ...after];
}

async function buildLorebookContext(
    id: string,
    messages: Message[],
    character: Character
) {
    const [embedded, linked, global] = await Promise.all([
        db.lorebooks
            .where("embeddedCharacterID")
            .equals(character.id)
            .and((lorebook) => Boolean(lorebook.enabled))
            .toArray(),
        db.lorebooks
            .where("linkedCharacterIDs")
            .equals(character.id)
            .and((lorebook) => Boolean(lorebook.enabled))
            .toArray(),
        db.lorebooks
            .where("global")
            .equals(1)
            .and((lorebook) => Boolean(lorebook.enabled))
            .toArray()
    ]);

    const set = new Set<Lorebook>();
    for (const lorebook of [...embedded, ...linked, ...global])
        set.add(lorebook);
    const lorebooks = [...set];

    if (lorebooks.length === 0) return messages;

    const history = messages
        .map(
            (message) =>
                message.parts.find((part) => part.type === "text")?.text ?? ""
        )
        .filter(Boolean);

    const assistantMessageCount = messages.filter(
        (message) => message.role === "assistant"
    ).length;

    const tokenizer = new Tiktoken(
        o200k_base.bpe_ranks,
        o200k_base.special_tokens,
        o200k_base.pat_str
    );

    const context: MatchContext = {
        messages: history,
        messageCount: history.length,
        assistantMessageCount,
        tokenCount: tokenizer.encode(history.join("\n")).length
    };

    tokenizer.free();

    const lorebookMatcher = LorebookMatcher.get(id);

    const matches = [];
    for (const lorebook of lorebooks) {
        const scanDepth =
            typeof lorebook.data.scan_depth === "number" &&
            lorebook.data.scan_depth >= 0
                ? lorebook.data.scan_depth
                : Infinity;

        const entries = lorebook.data.entries;
        const recursive = lorebook.data.recursive_scanning;

        const results = lorebookMatcher.scanLorebook(
            entries,
            context,
            scanDepth,
            recursive
        );

        matches.push(...results);
    }

    if (matches.length === 0) return messages;

    const before: Message[] = [];
    const after: Message[] = [];

    for (const match of matches) {
        const position = DecoratorParser.getInsertionPosition(
            match.decorators,
            context
        );

        const message: Message = {
            id: `lorebook-${generateCuid2()}`,
            role: position.role ?? "system",
            parts: [{ type: "text", text: match.content }],
            metadata: { createdAt: new Date() }
        };

        switch (position.position) {
            case "before":
                before.push(message);
                break;
            case "after":
                after.push(message);
                break;
            case "depth": {
                const index = Math.min(
                    Math.max(messages.length - (position?.depth ?? 0), 0),
                    messages.length
                );
                messages.splice(index, 0, message);
                break;
            }
            default:
                continue;
        }
    }

    const beforeIndex = messages.findIndex(
        (message) =>
            message.parts.find((part) => part.type === "text")?.text ===
            "{{lorebook.before}}"
    );

    const afterIndex = messages.findIndex(
        (message) =>
            message.parts.find((part) => part.type === "text")?.text ===
            "{{lorebook.after}}"
    );

    messages.splice(beforeIndex, 1, ...before);
    messages.splice(afterIndex, 1, ...after);

    return messages;
}

export async function buildContext(
    id: string,
    messages: Message[],
    preset: Preset,
    character: Character,
    persona: Persona
) {
    let context = buildPresetContext(messages, preset);
    context = await buildLorebookContext(id, context, character);

    const prompt = context
        .map((message) => ({
            ...message,
            parts: message.parts.map((part) =>
                part.type === "text"
                    ? {
                          ...part,
                          text: replaceMacros(part.text, {
                              character,
                              persona
                          })
                              .replace(/^<START>\s*/gm, "")
                              .trim()
                      }
                    : part
            )
        }))
        .filter((message) =>
            message.parts.find((part) => part.type === "text")?.text.trim()
        );

    const firstNonSystemIndex = prompt.findIndex(
        (message) => message.role !== "system"
    );

    const systemCount =
        firstNonSystemIndex === -1 ? prompt.length : firstNonSystemIndex;

    if (systemCount <= 1) return prompt;

    const systemMessages = prompt.slice(0, systemCount);
    const rest = prompt.slice(systemCount);

    const textParts = [];
    const otherParts = [];
    for (const message of systemMessages) {
        for (const part of message.parts) {
            if (part.type === "text") {
                textParts.push(part.text);
            } else {
                otherParts.push(part);
            }
        }
    }

    const combinedParts: (typeof systemMessages)[number]["parts"] = [];
    const combinedText = textParts.join("\n\n").trim();

    if (combinedText) {
        combinedParts.push({ type: "text", text: combinedText });
    }

    combinedParts.push(...otherParts);

    const creationTimes = systemMessages.map((message) =>
        new Date(message.metadata?.createdAt ?? Date.now()).getTime()
    );

    const minCreatedAt = new Date(Math.min(...creationTimes));

    const squashedSystemMessage: Message = {
        id: systemMessages[0].id,
        role: "system",
        parts: combinedParts,
        metadata: {
            createdAt: minCreatedAt
        }
    };

    return [squashedSystemMessage, ...rest];
}
