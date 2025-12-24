import { useCharacterContext } from "@/contexts/character-context";
import { useMarkdownLexer } from "@/hooks/use-markdown-lexer";
import { remarkCurlyBraces } from "@/lib/curly-braces";
import ReactMarkdown, {
    type Options,
    defaultUrlTransform
} from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { PluggableList } from "unified";

interface MarkdownBlockProps extends Options {
    content: string;
}

function MarkdownBlock({ content, ...props }: MarkdownBlockProps) {
    return <ReactMarkdown {...props}>{content}</ReactMarkdown>;
}

export interface MarkdownProps {
    id: string;
    content: string;
    streaming: boolean;
}

export function Markdown({ id, content, streaming }: MarkdownProps) {
    const { character, persona } = useCharacterContext();

    const remarkPlugins: PluggableList = streaming
        ? [remarkGfm, remarkBreaks]
        : [
              remarkGfm,
              remarkBreaks,
              [remarkCurlyBraces, { character, persona }]
          ];

    const rehypePlugins = streaming ? [] : [rehypeRaw];

    const components = {
        img: ({ ...props }) => (
            <img
                {...props}
                loading="eager"
                fetchPriority="high"
                onLoad={() => {
                    requestAnimationFrame(() =>
                        document
                            .getElementById("chat-scroll-anchor")
                            ?.scrollIntoView({
                                behavior: "smooth"
                            })
                    );
                }}
            />
        ),
        a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
        )
    };

    const urlMap = new Map<string, string>(
        character?.data.assets.map((asset) => {
            const filename = `${asset.name}.${asset.ext}`;
            const url = `/images/characters/${character.id}/${filename}`;
            return [filename, url];
        })
    );

    const urlTransform = (url: string) => {
        if (url.startsWith("embedded://")) {
            const key = url.replace("embedded://", "");
            return urlMap.get(key) ?? "";
        }
        return defaultUrlTransform(url);
    };

    const markdownBlocks = useMarkdownLexer(id, content, streaming);
    const markdown = markdownBlocks.map((block, index) => (
        <MarkdownBlock
            key={`${id}-block-${index}`}
            content={block}
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components}
            urlTransform={urlTransform}
        />
    ));

    return markdown;
}
