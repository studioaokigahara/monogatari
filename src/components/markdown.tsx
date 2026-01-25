import { useCharacterContext } from "@/contexts/character";
import { useMarkdownLexer } from "@/hooks/use-markdown-lexer";
import { remarkMacros, remarkXML } from "@/lib/remark";
import { cn, FNV1a } from "@/lib/utils";
import ReactMarkdown, { defaultUrlTransform, Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGFM from "remark-gfm";
import remend from "remend";
import { PluggableList } from "unified";

interface Props {
    children: string;
    id?: string | number;
    streaming?: boolean;
    className?: string;
}

interface StreamingProps {
    children: string;
    id: string | number;
    streaming: boolean;
    className?: string;
}

type MarkdownProps = Props | StreamingProps;

export function Markdown({
    children,
    id = FNV1a(children),
    streaming = false,
    className
}: MarkdownProps) {
    const { character, persona } = useCharacterContext();

    const remarkPlugins: PluggableList = streaming
        ? [remarkGFM, remarkBreaks]
        : [remarkGFM, remarkBreaks, remarkXML, [remarkMacros, { character, persona }]];

    const rehypePlugins = streaming ? [] : [rehypeRaw];

    const components: Options["components"] = {
        img: ({ alt, ...props }) => (
            <img
                {...props}
                alt={alt ?? ""}
                loading="eager"
                fetchPriority="high"
                onLoad={() => {
                    requestAnimationFrame(() =>
                        document.getElementById("chatScrollAnchor")?.scrollIntoView({
                            behavior: "smooth"
                        })
                    );
                }}
            />
        ),
        a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
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

    const mendedMarkdown = streaming ? remend(children) : children;
    const markdownBlocks = useMarkdownLexer(id, mendedMarkdown, streaming);
    const markdown = markdownBlocks.map((block, index) => (
        <ReactMarkdown
            key={`${id}-block-${index}`}
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components}
            urlTransform={urlTransform}
        >
            {block}
        </ReactMarkdown>
    ));

    return (
        <article
            className={cn(
                "prose dark:prose-invert prose-img:max-h-[75dvh] prose-img:justify-self-center prose-img:rounded-lg",
                streaming &&
                    "*:last:after:inline *:last:after:align-baseline *:last:after:content-['_▋']",
                className
            )}
        >
            {markdown}
        </article>
    );
}
