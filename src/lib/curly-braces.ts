import { Character } from "@/database/schema/character";
import { Persona } from "@/database/schema/persona";
import get from "lodash.get";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { Literal } from "unist";

function hashString(string: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < string.length; i++) {
        hash ^= string.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    hash = hash >>> 0;
    return hash / 0x100000000;
}

function splitValues(string: string): string[] {
    const result: string[] = [];
    let value = "";
    let escape = false;
    for (const char of string) {
        if (escape) {
            value += char;
            escape = false;
        } else if (char === "\\") {
            escape = true;
        } else if (char === ",") {
            result.push(value);
            value = "";
        } else {
            value += char;
        }
    }
    if (value !== "") result.push(value);
    return result;
}

function pick(values: string[], key: string): string {
    const seed = hashString(key);
    return values[Math.floor(seed * values.length)];
}

function roll(arg: string): string {
    let number: number;
    if (/^d(\d+)$/i.test(arg)) {
        number = Number.parseInt(arg.slice(1), 10);
    } else {
        number = Number.parseInt(arg, 10);
    }
    if (isNaN(number) || number < 1) return "0";
    return String(Math.floor(Math.random() * number) + 1);
}

export interface MacroContext {
    character?: Character;
    persona?: Persona;
}

/**
 * Process the body of one `{{…}}` macro (the text inside the braces).
 */
export function processMacro(body: string, context?: MacroContext): string {
    const macro = `{{${body}}}`;
    const { character, persona } = context ?? {};

    const [rawKey, ...rest] = body.split(":");
    const key = rawKey.trim().toLowerCase();
    const payload = rest.join(":").trim();

    if (key.startsWith("//")) return "";

    if (key.startsWith("char.")) {
        if (!character) return macro;
        const path = key
            .slice(5)
            .replace(/\[(\d+)]/g, ".$1")
            .split(".")
            .filter(Boolean);
        const value = get(character?.data, path);
        return Array.isArray(value) ? value.join("\n") : String(value);
    }

    switch (key) {
        case "char": {
            if (!character) return macro;
            if (character.data.nickname) {
                return character.data.nickname;
            }
            return character.data.name;
        }

        case "user": {
            if (!persona) return macro;
            return persona.name;
        }

        case "user.description": {
            if (!persona) return macro;
            return persona.description;
        }

        case "random": {
            const values = splitValues(payload);
            return values.length
                ? values[Math.floor(Math.random() * values.length)]
                : "";
        }

        case "pick": {
            const values = splitValues(payload);
            const seed = JSON.stringify(context) + body;
            return values.length ? pick(values, seed) : "";
        }

        case "roll": {
            return roll(payload);
        }

        case "hidden_key":
        case "trim":
        case "original":
            return "";

        case "comment": {
            return `<!-- ${payload} -->`;
        }

        case "reverse": {
            return Array.from(payload).reverse().join("");
        }

        default: {
            return macro;
        }
    }
}

/**
 * Run a global replace over all {{…}} in the given text,
 * delegating to processMacro() for each one.
 */
export function replaceMacros(text: string, context?: MacroContext): string {
    const curlyBraceRegex = /\{\{([^}]+)\}\}/g;

    let current = text;
    for (let i = 0; i < 27; i++) {
        let changed = false;
        const next = current.replace(curlyBraceRegex, (match, body) => {
            const output = processMacro(body, context);
            if (output !== match) changed = true;
            return output;
        });
        current = next;
        if (!changed) break;
    }

    return current;
}

export const remarkCurlyBraces: Plugin<[MacroContext?]> = (props = {}) => {
    return (tree) => {
        visit(tree, "text", (node: Literal) => {
            node.value = replaceMacros(node.value as string, props);
        });
    };
};
