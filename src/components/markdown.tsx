import { useCharacterContext } from "@/contexts/character-context";
import remarkCurlyBraces from "@/lib/remark-curly-braces";
import { marked } from "marked";
import { memo, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function parseMarkdown(markdown: string): string[] {
    const cache = useRef<{ source: string; tokens: string[] }>({
        source: "",
        tokens: []
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
}

const MarkdownBlock = memo(
    ({ children }: MarkdownBlockProps) => {
        const { character, persona, urlTransform } = useCharacterContext();

        const remarkPlugins = useMemo(
            () => [remarkGfm, [remarkCurlyBraces, { character, persona }]],
            [character, persona]
        );
        const rehypePlugins = useMemo(() => [rehypeRaw], []);
        const components = useMemo(() => {
            const handleImgLoad = () => {
                const anchor = document.getElementById("chat-scroll-anchor");
                requestAnimationFrame(() =>
                    anchor?.scrollIntoView({ behavior: "smooth" })
                );
            };

            return {
                img: ({ ...props }) => (
                    <img
                        {...props}
                        loading="eager"
                        fetchPriority="high"
                        onLoad={handleImgLoad}
                    />
                )
            };
        }, []);

        return (
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                urlTransform={urlTransform}
                components={components}
            >
                {children}
            </ReactMarkdown>
        );
    },
    (prev, next) => prev.children === next.children
);

export interface MarkdownProps {
    children: string;
    id: string;
}

export const Markdown = memo(({ children, id }: MarkdownProps) => {
    const blocks = parseMarkdown(children);

    return (
        <>
            {blocks.map((block, index) => (
                <MarkdownBlock key={`${id}-block-${index}`} children={block} />
            ))}
        </>
    );
});
