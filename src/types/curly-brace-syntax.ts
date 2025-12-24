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
