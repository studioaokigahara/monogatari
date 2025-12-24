import { Lexer } from "marked";
import { useEffect, useRef, useState, useTransition } from "react";

type CacheEntry = { source: string; tokens: string[] };
const cache = new Map<string, CacheEntry>();

/**
 * Incremental Markdown lexer. Uses a per-id cache of the source string and resulting tokens, lexing only the appended delta when streaming.
 *
 * @returns An array of raw Markdown blocks.
 */
export function useMarkdownLexer(
    id: string,
    markdown: string,
    streaming: boolean
): string[] {
    const [tokens, setTokens] = useState<string[]>(
        () => cache.get(id)?.tokens.slice() ?? []
    );

    const sourceRef = useRef<string>(cache.get(id)?.source ?? "");

    const [_isPending, startTransition] = useTransition();

    useEffect(() => {
        if (markdown === sourceRef.current) return;
        sourceRef.current = markdown;

        let entry = cache.get(id);
        if (!entry) {
            entry = { source: "", tokens: [] };
            cache.set(id, entry);
        }

        const lexMarkdown = () => {
            let mergedTokens: string[];

            if (
                streaming &&
                entry.source &&
                entry.tokens.length &&
                markdown.startsWith(entry.source)
            ) {
                const replaceFrom = Math.max(0, entry.tokens.length - 1);
                const lastToken = entry.tokens[replaceFrom];
                const deleteCount = lastToken ? 1 : 0;
                const delta = markdown.slice(entry.source.length);

                const newTokens = Lexer.lex(lastToken + delta, {
                    gfm: true
                }).map((token) => token.raw);

                mergedTokens = entry.tokens.slice();
                mergedTokens.splice(replaceFrom, deleteCount, ...newTokens);
            } else {
                mergedTokens = Lexer.lex(markdown, {
                    gfm: true
                }).map((token) => token.raw);
            }

            cache.set(id, { source: markdown, tokens: mergedTokens });
            setTokens(mergedTokens);
        };

        if (streaming) {
            startTransition(lexMarkdown);
        } else {
            lexMarkdown();
        }
    }, [id, markdown, streaming]);

    return tokens;
}
