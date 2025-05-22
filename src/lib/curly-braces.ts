import type { CharacterRecord } from "@/database/schema/character";
import type { PersonaRecord } from "@/database/schema/persona";

function hashString(s: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        hash ^= s.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    // to [0, 2^32)
    hash = hash >>> 0;
    return hash / 0x100000000;
}

function splitValues(str: string): string[] {
    const res: string[] = [];
    let cur = "";
    let esc = false;
    for (const ch of str) {
        if (esc) {
            cur += ch;
            esc = false;
        } else if (ch === "\\") {
            esc = true;
        } else if (ch === ",") {
            res.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    if (cur !== "") res.push(cur);
    return res;
}

function pick(values: string[], key: string): string {
    const seed = hashString(key);
    return values[Math.floor(seed * values.length)];
}

function roll(arg: string): string {
    let n: number;
    if (/^d(\d+)$/i.test(arg)) {
        n = Number.parseInt(arg.slice(1), 10);
    } else {
        n = Number.parseInt(arg, 10);
    }
    if (isNaN(n) || n < 1) return "0";
    return String(Math.floor(Math.random() * n) + 1);
}

function reverse(str: string): string {
    return Array.from(str).reverse().join("");
}

interface MacroContext {
    character?: CharacterRecord;
    persona?: PersonaRecord;
}

/**
 * Process the body of one `{{…}}` tag (the text inside the braces).
 */
export function processMacro(inner: string, ctx: MacroContext): string {
    const { character, persona } = ctx;

    // split off the key, and everything after the first colon is the payload
    const [rawKey, ...rest] = inner.split(":");
    const key = rawKey.trim().toLowerCase();
    const payload = rest.join(":").trim();

    switch (key) {
        case "char":
            if (
                character?.data.nickname &&
                character.data.nickname.length > 0
            ) {
                return character.data.nickname;
            }
            return character?.data.name ?? "";

        case "user":
            return persona?.name ?? "(You)";

        case "random": {
            const vals = splitValues(payload);
            return vals.length ? pick(vals, inner + Date.now()) : "";
        }

        case "pick": {
            const vals = splitValues(payload);
            return vals.length ? pick(vals, JSON.stringify(ctx) + inner) : "";
        }

        case "roll":
            return roll(payload);

        case "//":
        case "hidden_key":
            return "";

        case "comment":
            return `<!-- ${payload} -->`;

        case "reverse":
            return reverse(payload);

        default:
            // if we don’t understand the macro, leave it alone
            return `{{${inner}}}`;
    }
}

/**
 * Run a global replace over all {{…}} in the given text,
 * delegating to processMacro() for each one.
 */
export function replaceMacros(text: string, ctx: MacroContext): string {
    const RE = /\{\{([^}]+)\}\}/g;
    return text.replace(RE, (_match, inner) => {
        return processMacro(inner, ctx);
    });
}
