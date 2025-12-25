import { type LorebookEntry } from "@/database/schema/lorebook";
import { DecoratorParser, Decorator } from "./decorator";
import { replaceMacros } from "../curly-braces";

export interface MatchContext {
    messages: string[];
    messageCount: number;
    assistantMessageCount: number;
    tokenCount: number;
    greetingIndex?: number;
    userIcon?: string;
}

interface MatchResult {
    entry: LorebookEntry;
    decorators: Decorator[];
    content: string;
    priority: number;
}

export class LorebookMatcher {
    private previousMatches = new Set<string | number>();
    static registry = new Map<string, LorebookMatcher>();

    static get(id: string) {
        let lorebookMatcher = this.registry.get(id);

        if (!lorebookMatcher) {
            lorebookMatcher = new this();
            this.registry.set(id, lorebookMatcher);
        }

        return lorebookMatcher;
    }

    static delete(id: string) {
        this.registry.delete(id);
    }

    private normalizeKeys(keys: unknown): string[] | null {
        if (typeof keys === "string") return [keys];
        if (
            Array.isArray(keys) &&
            keys.every((key) => typeof key === "string")
        ) {
            return keys;
        }
        return null;
    }

    private checkKeys(
        keys: string[],
        content: string,
        useRegex: boolean,
        caseSensitive: boolean,
        matchWholeWords: boolean
    ): boolean {
        if (useRegex) {
            return keys.some((key) => {
                try {
                    new RegExp(key, caseSensitive ? "g" : "gi").test(content);
                } catch {
                    return false;
                }
            });
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

    private entryMatches(
        entry: LorebookEntry,
        decorators: Decorator[],
        context: MatchContext,
        defaultScanDepth: number = Infinity
    ) {
        if (!entry.enabled) return false;

        if (entry.constant && !entry.use_regex) return true;

        const activate = decorators.some(
            (decorator) => decorator.name === "activate"
        );

        const dontActivate = decorators.some(
            (decorator) => decorator.name === "dont_activate"
        );

        if (!activate && dontActivate) {
            return false;
        } else if (activate) {
            return true;
        }

        const dontActivateAfterMatch = decorators.some(
            (decorator) => decorator.name === "dont_activate_after_match"
        );

        if (dontActivateAfterMatch && this.previousMatches.has(entry.id)) {
            return false;
        }

        const keepActivated = decorators.some(
            (decorator) => decorator.name === "keep_activate_after_match"
        );

        if (keepActivated && this.previousMatches.has(entry.id)) return true;

        const greeting = decorators.find(
            (decorator) => decorator.name === "is_greeting"
        );

        if (greeting && context.greetingIndex !== greeting.value) return false;

        const userIcon = decorators.find(
            (decorator) => decorator.name === "is_user_icon"
        );
        if (userIcon && context.userIcon !== userIcon.value) return false;

        const onlyActivateAfter = decorators.find(
            (decorator) => decorator.name === "activate_only_after"
        );

        if (
            onlyActivateAfter &&
            typeof onlyActivateAfter.value === "number" &&
            context.assistantMessageCount < onlyActivateAfter.value
        ) {
            return false;
        }

        const onlyActivateEvery = decorators.find(
            (decorator) => decorator.name === "activate_only_every"
        );
        if (
            onlyActivateEvery &&
            typeof onlyActivateEvery.value === "number" &&
            context.assistantMessageCount % onlyActivateEvery.value !== 0
        ) {
            return false;
        }

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
            entry.case_sensitive,
            matchWholeWords
        );

        if (!matchedKeys) return false;

        if (entry.selective && entry.secondary_keys && !entry.use_regex) {
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
            const keys = this.normalizeKeys(decorator.value);
            if (!keys) continue;

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

        if (!entry.use_regex) {
            for (const decorator of excludeKeysDecorators) {
                const keys = this.normalizeKeys(decorator.value);
                if (!keys) continue;

                const excluded = this.checkKeys(
                    keys,
                    contextWindow,
                    entry.use_regex,
                    entry.case_sensitive ?? false,
                    matchWholeWords
                );

                if (excluded) return false;
            }
        }

        return true;
    }

    private scan(
        entries: LorebookEntry[],
        context: MatchContext,
        scanDepth: number = Infinity
    ): MatchResult[] {
        const results: MatchResult[] = [];
        for (const entry of entries) {
            const { decorators, content } = DecoratorParser.parseContent(
                entry.content
            );

            if (this.entryMatches(entry, decorators, context, scanDepth)) {
                const recursionOnly = decorators.some(
                    (decorator) =>
                        decorator.name === "activate_only_on_recursion"
                );

                if (recursionOnly) continue;

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

    private recursiveScan(
        entries: LorebookEntry[],
        context: MatchContext,
        scanDepth: number = Infinity
    ): MatchResult[] {
        const visitedMatches = new Set<string | number>();
        const results: MatchResult[] = [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            if (visitedMatches.has(entry.id)) continue;

            const { decorators, content } = DecoratorParser.parseContent(
                entry.content
            );

            const ignoreOnRecursion = decorators.some(
                (decorator) => decorator.name === "ignore_on_recursion"
            );

            if (ignoreOnRecursion) continue;

            if (this.entryMatches(entry, decorators, context)) {
                const resolvedContent = replaceMacros(content);

                results.push({
                    entry,
                    decorators,
                    content: resolvedContent,
                    priority: entry.priority ?? 0
                });

                visitedMatches.add(entry.id);

                const recursionDepth = decorators.find(
                    (decorator) => decorator.name === "recursion_depth"
                );

                if (recursionDepth?.value === i) continue;

                if (context.messages.length > 0) {
                    const newContext = {
                        ...context,
                        messages: [...context.messages, resolvedContent]
                    };

                    const recursiveMatches = this.recursiveScan(
                        entries,
                        newContext,
                        scanDepth
                    );

                    results.push(...recursiveMatches);
                }
            }
        }

        return results;
    }

    scanLorebook(
        entries: LorebookEntry[],
        context: MatchContext,
        scanDepth: number,
        recursive: boolean
    ): MatchResult[] {
        const results = recursive
            ? this.recursiveScan(entries, context, scanDepth)
            : this.scan(entries, context, scanDepth);

        for (const result of results) {
            this.previousMatches.add(String(result.entry.id));
        }

        return results;
    }
}
