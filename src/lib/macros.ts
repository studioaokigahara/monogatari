import { MacroContext, MacroRuntime } from "@/types/macros";
import get from "lodash.get";
import { DateTime } from "luxon";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

function FNV1a(string: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < string.length; i++) {
        hash ^= string.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    hash = hash >>> 0;
    return hash / 0x100000000;
}

function splitValues(string: string): string[] {
    let value = "";
    let escape = false;

    const result: string[] = [];
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

    result.push(value);
    return result;
}

function pick(
    runtime: MacroRuntime,
    body: string,
    payload: string,
    values: string[]
): string {
    const mapKey = `${runtime.seed}::${runtime.pickKey}::${body}::${payload}`;
    const cached = runtime.pickMap.get(mapKey);
    if (cached) return cached;

    const seed = FNV1a(mapKey);
    const pickedValue = values[Math.floor(seed * values.length)];
    runtime.pickMap.set(mapKey, pickedValue);
    return pickedValue;
}

function roll(arg: string): string {
    const number = /^d(\d+)$/i.test(arg)
        ? parseInt(arg.slice(1), 10)
        : parseInt(arg, 10);
    if (isNaN(number) || number < 1) return "0";
    return String(Math.floor(Math.random() * number) + 1);
}

function getVariable(body: string) {
    const match = body.match(/^getvar\s*::\s*([\s\S]*)$/i);
    if (!match) return null;

    const rest = match[1];
    const separator = rest.indexOf("::");
    if (separator === -1) {
        return { variable: rest.trim(), fallback: "" };
    }

    return {
        variable: rest.slice(0, separator).trim(),
        fallback: rest.slice(separator + 2)
    };
}

function setVariable(body: string) {
    const match = body.match(/^setvar\s*::\s*([\s\S]*)$/i);
    if (!match) return null;

    const rest = match[1];
    const separator = rest.indexOf("::");
    if (separator === -1) {
        return { variable: rest.trim(), value: "" };
    }

    return {
        variable: rest.slice(0, separator).trim(),
        value: rest.slice(separator + 2)
    };
}

/**
 * Process the body of one `{{...}}` macro (the text inside the braces).
 */
function processMacroBody(
    body: string,
    runtime: MacroRuntime,
    context?: MacroContext
): string {
    const macro = `{{${body}}}`;
    const { character, persona, variables } = context ?? {};

    const getvar = getVariable(body);
    if (getvar) {
        if (!variables) return macro;
        const value = variables[getvar.variable];
        return typeof value === "string" ? value : "";
    }

    const setvar = setVariable(body);
    if (setvar) {
        if (!variables) return macro;

        const resolvedValue = setvar.value
            ? replaceMacro(
                  setvar.value,
                  { ...runtime, pickKey: `${runtime.pickKey}::setvar` },
                  context
              )
            : "";

        if (setvar.variable) variables[setvar.variable] = resolvedValue;
        return "";
    }

    const [rawKey, ...rest] = body.split(":");
    const key = rawKey.trim().toLowerCase();
    const rawPayload = rest.join(":").trim();

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

    const payload = rawPayload.includes("{{")
        ? replaceMacro(
              rawPayload,
              { ...runtime, pickKey: `${runtime.pickKey}::payload` },
              context
          )
        : rawPayload;

    switch (key) {
        case "char":
            if (!character) return macro;
            return character.data.nickname
                ? character.data.nickname
                : character.data.name;
        case "user":
            if (!persona) return macro;
            return persona.name;
        case "user.description":
            if (!persona) return macro;
            return persona.description;
        case "random": {
            const values = splitValues(payload);
            return values.length
                ? values[Math.floor(Math.random() * values.length)]
                : "";
        }
        case "pick":
            const values = splitValues(payload);
            return values.length ? pick(runtime, body, payload, values) : "";
        case "roll":
            return roll(payload);
        case "hidden_key":
        case "trim":
        case "original":
            return "";
        case "comment":
            return `<!-- ${payload} -->`;
        case "reverse":
            return Array.from(payload).reverse().join("");
        case "date":
            return DateTime.now().toLocaleString(DateTime.DATE_FULL);
        case "time":
            return DateTime.now().toLocaleString(DateTime.TIME_SIMPLE);
        default:
            return macro;
    }
}

function replaceMacro(
    text: string,
    runtime: MacroRuntime,
    context?: MacroContext
) {
    let i = 0;
    const parts: string[] = [];
    while (i < text.length) {
        const start = text.indexOf("{{", i);
        if (start === -1) {
            parts.push(text.slice(i));
            break;
        }

        parts.push(text.slice(i, start));

        let depth = 1;
        let j = start + 2;
        while (j < text.length) {
            if (text.startsWith("{{", j)) {
                depth++;
                j += 2;
                continue;
            }
            if (text.startsWith("}}", j)) {
                depth--;
                if (depth === 0) break;
                j += 2;
                continue;
            }
            j++;
        }

        if (depth !== 0) {
            parts.push(text.slice(start));
            break;
        }

        const body = text.slice(start + 2, j);
        const originalMacro = text.slice(start, j + 2);

        runtime.pickKey = `${runtime.pickKey}::${start}`;
        const expandedMacro = processMacroBody(body, runtime, context);

        if (expandedMacro.includes("{{") && expandedMacro !== originalMacro) {
            runtime.depth++;
            runtime.pickKey = `${runtime.pickKey}::result`;
            parts.push(replaceMacro(expandedMacro, runtime, context));
            runtime.depth--;
        } else {
            parts.push(expandedMacro);
        }

        i = j + 2;
    }

    return parts.join("");
}

/**
 * Run a global replace over all {{…}} in the given text,
 * delegating to `replaceMacro` for each one.
 */
export function replaceMacros(text: string, context?: MacroContext): string {
    const runtime: MacroRuntime = {
        seed: FNV1a(text),
        pickMap: new Map(),
        pickKey: "root",
        depth: 0
    };

    return replaceMacro(text, runtime, context);
}

export const remarkCurlyBraceSyntax: Plugin<[MacroContext?]> = (props = {}) => {
    return (tree) => {
        visit(tree, ["text", "code", "inlineCode"] as const, (node) => {
            if (
                "value" in node &&
                typeof node.value === "string" &&
                node.value.includes("{{")
            ) {
                node.value = replaceMacros(node.value, props);
            }
        });
    };
};
