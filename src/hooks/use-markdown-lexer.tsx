import { Lexer } from "marked";
import { useEffect, useState, useTransition } from "react";

type CacheEntry = { source: string; tokens: string[] };
const MARKDOWN_CACHE = new Map<string | number, CacheEntry>();

/**
 * Incremental Markdown lexer. Uses a per-id cache of the source string
 * and resulting tokens, lexing the appended delta inside a
 * transition to prevent blocking the main thread.
 *
 * @returns An array of raw Markdown blocks.
 */
export function useMarkdownLexer(
    id: string | number,
    markdown: string,
    streaming: boolean
): string[] {
    const [tokens, setTokens] = useState<string[]>([]);
    const [_pending, startTransition] = useTransition();

    useEffect(() => {
        if (!streaming || MARKDOWN_CACHE.get(id)?.source === markdown) return;

        startTransition(() => {
            const entry = MARKDOWN_CACHE.get(id);
            let newTokens: string[];

            if (entry?.source && entry.tokens.length && markdown.startsWith(entry.source)) {
                const lastIndex = entry.tokens.length - 1;
                const delta = markdown.slice(entry.source.length);
                const deltaTokens = Lexer.lex(entry.tokens[lastIndex] + delta, { gfm: true }).map(
                    (token) => token.raw
                );
                newTokens = [...entry.tokens.slice(0, lastIndex), ...deltaTokens];
            } else {
                newTokens = Lexer.lex(markdown, { gfm: true }).map((token) => token.raw);
            }

            MARKDOWN_CACHE.set(id, { source: markdown, tokens: newTokens });
            setTokens(newTokens);
        });
    }, [id, markdown, streaming]);

    return streaming ? tokens : [markdown];
}
