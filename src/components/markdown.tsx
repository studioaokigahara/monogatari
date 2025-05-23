import { useCharacterContext } from "@/contexts/character-context";
import remarkCurlyBraces from "@/lib/remark-curly-braces";
import { marked } from "marked";
import { memo, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function parseMarkdown(markdown: string): string[] {
    const cache = useRef<{ source: string; tokens: string[] }>({
        source: "",
        tokens: [],
    });

    if (markdown === cache.current.source) return cache.current.tokens;

    if (markdown.startsWith(cache.current.source)) {
        const delta = markdown.slice(cache.current.source.length);
        const prevTokens = [...cache.current.tokens];
        const lastToken = prevTokens.pop() ?? "";
        const newTokens = marked
            .lexer(lastToken + delta)
            .map((token) => token.raw);
        const merged = prevTokens.concat(newTokens);
        cache.current = { source: markdown, tokens: merged };
        return merged;
    }

    const fresh = marked.lexer(markdown).map((token) => token.raw);
    cache.current = { source: markdown, tokens: fresh };
    return fresh;
}

interface MarkdownBlockProps {
    children: string;
    urlTransform: (url: string) => string;
}

const MarkdownBlock = memo(
    ({ children, urlTransform }: MarkdownBlockProps) => {
        const { character, persona } = useCharacterContext();

        return (
            <ReactMarkdown
                remarkPlugins={[
                    remarkGfm,
                    [remarkCurlyBraces, { character, persona }],
                ]}
                rehypePlugins={[rehypeRaw]}
                urlTransform={urlTransform}
                components={{
                    img: ({ node: _node, ...props }) => (
                        <img {...props} loading="eager" fetchPriority="high" />
                    ),
                }}
            >
                {children}
            </ReactMarkdown>
        );
    },
    (prev, next) =>
        prev.children === next.children &&
        prev.urlTransform === next.urlTransform,
);

export interface MarkdownProps {
    children: string;
    id: string;
    urlTransform: (url: string) => string;
}

export const Markdown = memo(
    ({ children, id, urlTransform }: MarkdownProps) => {
        const blocks = parseMarkdown(children);

        return (
            <>
                {blocks.map((block, index) => (
                    <MarkdownBlock
                        key={`${id}-block-${index}`}
                        children={block}
                        urlTransform={urlTransform}
                    />
                ))}
            </>
        );
    },
);
