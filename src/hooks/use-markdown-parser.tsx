import { marked } from "marked";
import { useEffect, useRef, useState } from "react";

type Message = { tokens: string[]; id: string };
const localCache = new Map<string, string[]>();

/**
 * Incremental Markdown lexer with local cache.
 * Runs Markdown parsing in a service worker off
 * the main thread when streaming, and parses locally
 * when not. Returns an array of raw Markdown blocks.
 */
export function useMarkdownParser(
    markdown: string,
    id: string,
    status: "submitted" | "streaming" | "ready" | "error"
): string[] {
    const [tokens, setTokens] = useState<string[]>(
        () => localCache.get(id) ?? []
    );
    const bufferRef = useRef<string[]>([]);
    const rafRef = useRef<number | null>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        const worker = new Worker(
            new URL("@/lib/workers/markdown-parser.worker.ts", import.meta.url),
            { type: "module" }
        );
        workerRef.current = worker;

        worker.onmessage = ({ data }: MessageEvent<Message>) => {
            if (data.id !== id) return;

            bufferRef.current = data.tokens;
            localCache.set(data.id, data.tokens);

            if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    setTokens(bufferRef.current);
                });
            }
        };

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            worker.terminate();
        };
    }, [id]);

    useEffect(() => {
        const cached = localCache.get(id);

        if (cached && cached.join("") === markdown) {
            bufferRef.current = cached;
            setTokens(cached);
            return;
        }

        const notStreaming = status === "ready" || status === "error";

        if (notStreaming && !cached) {
            const parsed = marked.lexer(markdown).map((token) => token.raw);
            bufferRef.current = parsed;
            localCache.set(id, parsed);
            setTokens(parsed);
            return;
        }

        workerRef.current?.postMessage({ markdown, id });
    }, [markdown, id, status]);

    return tokens;
}
