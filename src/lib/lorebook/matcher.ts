import { type LorebookEntry } from "@/database/schema/lorebook";
import { DecoratorParser, Decorator } from "./decorator";
import { replaceMacros } from "../curly-braces";

interface MatchContext {
    messages: string[];
    messageCount: number;
    tokenCount: number;
    greetingIndex?: number;
    userIcon?: string;
    previousMatches: Set<string>;
}

interface MatchResult {
    entry: LorebookEntry;
    decorators: Decorator[];
    content: string;
    priority: number;
}

export class LorebookMatcher {
    static checkKeys(
        keys: string[],
        content: string,
        useRegex: boolean,
        caseSensitive: boolean,
        matchWholeWords: boolean
    ): boolean {
        if (useRegex) {
            return keys.some((key) =>
                new RegExp(key, caseSensitive ? "g" : "gi").test(content)
            );
        }

        if (matchWholeWords) {
            return keys.some((key) => {
                const escapeRegex = (s: string) => {
                    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                };
                const pattern = new RegExp(
                    `\\b${escapeRegex(key)}\\b`,
                    caseSensitive ? "g" : "gi"
                );
                return pattern.test(content);
            });
        }

        const searchText = caseSensitive ? content : content.toLowerCase();
        return keys.some((key) => {
            const searchKey = caseSensitive ? key : key.toLowerCase();
            return searchText.includes(searchKey);
        });
    }

    static entryMatches(
        entry: LorebookEntry,
        context: MatchContext,
        defaultScanDepth: number = Infinity
    ) {
        if (!entry.enabled) return false;

        const { decorators } = DecoratorParser.parseContent(entry.content);

        const decoratorsChecked = decorators.every((decorator) =>
            DecoratorParser.checkDecorator(
                decorator,
                context,
                String(entry.id ?? "")
            )
        );

        if (!decoratorsChecked) return false;

        if (entry.constant) return true;

        const scanDepth = DecoratorParser.getScanDepth(
            decorators,
            defaultScanDepth
        );

        const contextWindow = context.messages.slice(-scanDepth).join(" ");

        const matchWholeWords = decorators.some(
            (decorator) => decorator.name === "match_whole_words"
        );

        const matchedKeys = this.checkKeys(
            entry.keys,
            contextWindow,
            entry.use_regex,
            entry.case_sensitive ?? false,
            matchWholeWords
        );

        if (!matchedKeys) return false;

        if (entry.selective && entry.secondary_keys) {
            const secondaryMatch = this.checkKeys(
                entry.secondary_keys,
                contextWindow,
                entry.use_regex,
                entry.case_sensitive ?? false,
                matchWholeWords
            );
            if (!secondaryMatch) return false;
        }

        const additionalKeysDecorators = decorators.filter(
            (decorator) => decorator.name === "additional_keys"
        );

        for (const decorator of additionalKeysDecorators) {
            if (typeof decorator.value !== "string") return false;
            const keys = Array.isArray(decorator.value)
                ? decorator.value
                : [decorator.value];
            const additionalMatch = this.checkKeys(
                keys,
                contextWindow,
                entry.use_regex,
                entry.case_sensitive ?? false,
                matchWholeWords
            );
            if (!additionalMatch) return false;
        }

        const excludeKeysDecorators = decorators.filter(
            (decorator) => decorator.name === "exclude_keys"
        );

        for (const decorator of excludeKeysDecorators) {
            if (typeof decorator.value !== "string") return false;
            const keys = Array.isArray(decorator.value)
                ? decorator.value
                : [decorator.value];
            const excluded = this.checkKeys(
                keys,
                contextWindow,
                entry.use_regex,
                entry.case_sensitive ?? false,
                matchWholeWords
            );
            if (excluded) return false;
        }

        return true;
    }

    static scan(
        entries: LorebookEntry[],
        context: MatchContext,
        defaultScanDepth: number = Infinity
    ): MatchResult[] {
        const results: MatchResult[] = [];
        for (const entry of entries) {
            if (this.entryMatches(entry, context, defaultScanDepth)) {
                const { decorators, content } = DecoratorParser.parseContent(
                    entry.content
                );

                const delayUntilRecursion = decorators.some(
                    (decorator) => decorator.name === "delay_until_recursion"
                );

                if (delayUntilRecursion) continue;

                results.push({
                    entry,
                    decorators,
                    content: replaceMacros(content),
                    priority: entry.priority ?? 0
                });
            }
        }
        return results;
    }

    static recursiveScan(
        entries: LorebookEntry[],
        context: MatchContext,
        defaultScanDepth: number = Infinity
    ): MatchResult[] {
        const results: MatchResult[] = [];

        for (const entry of entries) {
            const entryID = String(entry.id ?? "");
            if (context.previousMatches.has(entryID)) continue;

            const { decorators, content } = DecoratorParser.parseContent(
                entry.content
            );

            const nonRecursable = decorators.some(
                (decorator) => decorator.name === "non_recursable"
            );

            if (nonRecursable) continue;

            if (this.entryMatches(entry, context)) {
                const resolvedContent = replaceMacros(content);

                results.push({
                    entry,
                    decorators,
                    content: resolvedContent,
                    priority: entry.priority ?? 0
                });

                context.previousMatches.add(entryID);

                const preventRecursion = decorators.some(
                    (decorator) => decorator.name === "prevent_recursion"
                );

                if (preventRecursion) continue;

                if (context.messages.length > 0) {
                    const newContext = {
                        ...context,
                        messages: [...context.messages, resolvedContent]
                    };
                    const recursiveMatches = this.recursiveScan(
                        entries,
                        newContext,
                        defaultScanDepth
                    );
                    results.push(...recursiveMatches);
                }
            }
        }

        return results;
    }
}
