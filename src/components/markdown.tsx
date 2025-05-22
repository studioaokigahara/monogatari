import { useCharacterContext } from "@/contexts/character-context";
import remarkCurlyBraces from "@/lib/remark-curly-braces";
import { marked } from "marked";
import { memo, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function parseMarkdown(markdown: string): string[] {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
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
                    img: ({ node, ...props }) => (
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
        const blocks = useMemo(() => parseMarkdown(children), [children]);

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
