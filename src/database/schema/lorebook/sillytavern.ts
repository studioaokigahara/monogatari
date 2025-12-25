import z from "zod";
import { LorebookData } from "../lorebook";

const SillyTavernLorebookEntry = z.looseObject({
    key: z.array(z.string()),
    keysecondary: z.array(z.string()),
    comment: z.string().default(""),
    content: z.string(),

    constant: z.boolean(),
    vectorized: z.boolean(),
    selective: z.boolean(),
    selectiveLogic: z.number(),
    addMemo: z.boolean(),
    order: z.number(),
    position: z.number(),
    disable: z.boolean(),

    excludeRecursion: z.boolean(),
    preventRecursion: z.boolean(),
    delayUntilRecursion: z.boolean(),

    matchPersonaDescription: z.boolean(),
    matchCharacterDescription: z.boolean(),
    matchCharacterPersonality: z.boolean(),
    matchCharacterDepthPrompt: z.boolean(),
    matchScenario: z.boolean(),
    matchCreatorNotes: z.boolean(),

    probability: z.number(),
    useProbability: z.boolean(),
    depth: z.number(),
    scanDepth: z.number().nullable(),
    caseSensitive: z.boolean().nullable(),
    matchWholeWords: z.boolean().nullish(),

    group: z.string(),
    groupOverride: z.boolean(),
    groupWeight: z.number(),
    useGroupScoring: z.boolean().nullish(),

    automationId: z.string(),
    role: z.number().nullable(),
    sticky: z.number().int().nullish(),
    cooldown: z.number().int().nullish(),
    delay: z.number().int().nullish(),
    uid: z.number().int(),
    displayIndex: z.union([z.number().int(), z.string()]),
    extensions: z.record(z.string(), z.any()).nullish(),
    ignoreBudget: z.boolean(),
    triggers: z.array(z.any()),
    characterFilter: z
        .object({
            isExclude: z.boolean(),
            names: z.array(z.string()),
            tags: z.array(z.string())
        })
        .optional()
});
type SillyTavernLorebookEntry = z.infer<typeof SillyTavernLorebookEntry>;

const SillyTavernLorebook = z.object({
    entries: z.record(z.string(), SillyTavernLorebookEntry),
    originalData: z
        .object({
            name: z.string().optional(),
            description: z.string().optional(),
            scan_depth: z.number().optional(),
            token_budget: z.number().optional(),
            recursive_scanning: z.boolean().optional(),
            extensions: z.record(z.string(), z.any()).optional()
        })
        .optional()
});
type SillyTavernLorebook = z.infer<typeof SillyTavernLorebook>;

function buildDecorators(entry: SillyTavernLorebookEntry): string[] {
    const decorators: string[] = [];

    if (typeof entry.depth === "number") {
        decorators.push(`@@depth ${entry.depth}`);
    }

    if (typeof entry.scanDepth === "number") {
        decorators.push(`@@scan_depth ${entry.scanDepth}`);
    }

    if (entry.ignoreBudget === true) {
        decorators.push("@@ignore_token_budget");
    }

    if (entry.excludeRecursion === true) {
        decorators.push("@@ignore_on_recursion");
    }

    if (entry.preventRecursion === true) {
        decorators.push("@@recursion_depth 1");
    }

    if (entry.delayUntilRecursion === true) {
        decorators.push("@@activate_only_on_recursion");
    }

    if (entry.matchWholeWords === true) {
        decorators.push("@@match_whole_words");
    }

    return decorators;
}

export const SillyTavernLorebookConverter = SillyTavernLorebook.transform(
    (lorebook) => {
        const entries = Object.entries(lorebook.entries || {}).map(
            ([id, entry]) => {
                const keys = (
                    Array.isArray(entry.key) ? entry.key : [entry.key]
                ).filter(Boolean);

                const decorators = buildDecorators(entry);
                const content = decorators.length
                    ? `${decorators.join("\n")}\n${(entry.content || "").replace(/^\s+/, "")}`
                    : entry.content || "";

                const case_sensitive =
                    typeof entry.caseSensitive === "boolean"
                        ? entry.caseSensitive
                        : false;

                const secondary_keys = (
                    Array.isArray(entry.keysecondary)
                        ? entry.keysecondary
                        : [entry.keysecondary]
                ).filter(Boolean);
                const selective = secondary_keys.length
                    ? true
                    : entry.selective;

                const position =
                    entry.position === 0
                        ? ("before_char" as const)
                        : ("after_char" as const);

                const {
                    key: _key,
                    content: _content,
                    disable,
                    order,
                    caseSensitive: _caseSensitive,
                    constant,
                    comment,
                    selective: _selection,
                    keysecondary: _keysecondary,
                    position: _position,
                    extensions: stExtensions,
                    ...rest
                } = entry;

                const { probability, selectiveLogic, ...restWithoutChub } =
                    rest;

                const namespacedExtensions = {
                    sillytavern: {
                        ...restWithoutChub,
                        ...stExtensions
                    },
                    ...(typeof probability !== "undefined" ||
                    typeof selectiveLogic !== "undefined"
                        ? {
                              chub: {
                                  ...(typeof probability === "number"
                                      ? { probability }
                                      : {}),
                                  ...(typeof selectiveLogic !== "undefined"
                                      ? { selectiveLogic }
                                      : {})
                              }
                          }
                        : {})
                };

                return {
                    keys,
                    content,
                    extensions: namespacedExtensions,
                    enabled: !disable,
                    insertion_order: order,
                    case_sensitive,
                    use_regex: false,
                    name: comment,
                    priority: 0,
                    id,
                    comment: "",
                    selective,
                    secondary_keys,
                    position,
                    constant: constant ?? false
                };
            }
        );

        const data = lorebook.originalData;
        const lorebookV3: LorebookData = {
            name: data?.name ?? "Imported Lorebook",
            description: data?.description ?? "Imported Lorebook",
            scan_depth:
                typeof data?.scan_depth === "number" ? data?.scan_depth : -1,
            token_budget:
                typeof data?.token_budget === "number"
                    ? data?.token_budget
                    : -1,
            recursive_scanning: data?.recursive_scanning ?? false,
            extensions: data?.extensions
                ? { sillytavern: data?.extensions }
                : {},
            entries
        };

        return LorebookData.parse(lorebookV3);
    }
);
