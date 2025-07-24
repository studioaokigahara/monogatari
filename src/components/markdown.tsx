import { useCharacterContext } from "@/contexts/character-context";
import { useChatContext } from "@/contexts/chat-context";
import { useMarkdownParser } from "@/hooks/use-markdown-parser";
import remarkCurlyBraces from "@/lib/remark-curly-braces";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

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
    const status = useChatContext((context) => context.status);
    const blocks = useMarkdownParser(children, id, status);

    return (
        <>
            {blocks.map((block, index) => (
                <MarkdownBlock key={`${id}-block-${index}`} children={block} />
            ))}
        </>
    );
});
