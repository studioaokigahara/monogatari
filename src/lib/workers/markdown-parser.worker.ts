import { marked } from "marked";

type Cache = { source: string, tokens: string[] };
const caches = new Map<string, Cache>();

type Request = { markdown: string; id: string };
type Response = { tokens: string[]; id: string };

function postMessage(tokens: string[], id: string) {
    (self as unknown as Worker).postMessage(<Response>{ tokens, id });
}

self.onmessage = ({ data }: MessageEvent<Request>) => {
    const { markdown, id } = data;

    let cache = caches.get(id)
    if (!cache) {
        cache = { source: "", tokens: [] };
        caches.set(id, cache)
    }

    if (markdown === cache.source) {
        postMessage(cache.tokens, id);
        return;
    }

    if (markdown.startsWith(cache.source)) {
        const delta = markdown.slice(cache.source.length);
        const oldTokens = [...cache.tokens];
        const lastToken = oldTokens.pop() ?? "";
        const newTokens = marked
            .lexer(lastToken + delta)
            .map((token) => token.raw);
        const merged = oldTokens.concat(newTokens);
        cache = { source: markdown, tokens: merged };
        caches.set(id, cache)
        postMessage(merged, id)
        return;
    }

    const fresh = marked.lexer(markdown).map((tokens) => tokens.raw);
    cache = { source: markdown, tokens: fresh };
    caches.set(id, cache)
    postMessage(fresh, id);
};
