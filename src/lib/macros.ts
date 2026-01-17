import { FNV1a } from "@/lib/utils";
import { MacroContext, MacroRuntime } from "@/types/macros";
import { format } from "date-fns";

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

function pick(runtime: MacroRuntime, body: string, payload: string): string {
    const values = splitValues(payload);
    if (!values.length) return "";

    const mapKey = `${runtime.seed}::${runtime.pickKey}::${body}::${payload}`;
    const cached = runtime.pickMap.get(mapKey);
    if (cached) return cached;

    const seed = FNV1a(mapKey);
    const pickedValue = values[Math.floor(seed * values.length)];
    runtime.pickMap.set(mapKey, pickedValue);
    return pickedValue;
}

function roll(arg: string): string {
    const number = /^d(\d+)$/i.test(arg) ? parseInt(arg.slice(1), 10) : parseInt(arg, 10);
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
function processMacroBody(body: string, runtime: MacroRuntime, context?: MacroContext): string {
    const macro = `{{${body}}}`;
    const { character, persona, variables } = context ?? {};

    const getvar = getVariable(body);
    if (getvar) {
        return variables ? variables[getvar.variable] : macro;
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
        const property = key.slice(5);
        const value = character.data[property as keyof typeof character.data];
        if (value === undefined || value === null) return "";
        return Array.isArray(value) ? value.join("\n") : (value as string);
    }

    const payload = rawPayload.includes("{{")
        ? replaceMacro(rawPayload, { ...runtime, pickKey: `${runtime.pickKey}::payload` }, context)
        : rawPayload;

    switch (key) {
        case "char":
            if (!character) return macro;
            return character.data.nickname ? character.data.nickname : character.data.name;
        case "user":
            return persona ? persona.name : macro;
        case "user.description":
            return persona ? persona.description : macro;
        case "random":
            const values = splitValues(payload);
            return values.length ? values[Math.floor(Math.random() * values.length)] : "";
        case "pick":
            return pick(runtime, body, payload);
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
            return format(Date.now(), "PPP");
        case "time":
            return format(Date.now(), "p");
        default:
            return macro;
    }
}

function replaceMacro(text: string, runtime: MacroRuntime, context?: MacroContext) {
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
