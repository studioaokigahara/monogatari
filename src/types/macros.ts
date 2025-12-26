import { type Character } from "@/database/schema/character";
import { type Persona } from "@/database/schema/persona";

export interface MacroContext {
    character?: Character;
    persona?: Persona;
    variables?: Record<string, string>;
}

export interface MacroRuntime {
    seed: number;
    pickMap: Map<string, string>;
    pickKey: string;
    depth: number;
}

export const Macros = [
    "char",
    "char.name",
    "char.nickname",
    "char.",
    "user",
    "user.description",
    "random",
    "pick",
    "roll",
    "//",
    "hidden_key",
    "comment",
    "reverse"
] as const;
export type Macros = typeof Macros;
export type Macro = (typeof Macros)[number];
