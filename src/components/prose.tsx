import { useCharacterContext } from "@/contexts/character-context";
import { cn } from "@/lib/utils";
import { memo, useCallback, useId as useID, useMemo } from "react";
import { defaultUrlTransform } from "react-markdown";
import { Markdown } from "./markdown";

interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
    children: string;
    id?: string;
}

export const Prose = memo(function Prose({
    children,
    id,
    className,
    ...props
}: ProseProps) {
    const { character } = useCharacterContext();

    const generatedID = useID();
    const memoID = id ?? generatedID;

    const urlMap = useMemo(() => {
        const map = new Map<string, string>();
        const assets = character?.assets
            ? character.assets.map((asset) => asset)
            : [];
        for (const asset of assets) {
            const key = `${asset.name}.${asset.ext}`;
            const url = URL.createObjectURL(asset.blob);
            map.set(key, url);
        }
        return map;
    }, [character]);

    const urlTransform = useCallback(
        (url: string) => {
            if (url.startsWith("embedded://")) {
                const key = url.replace("embedded://", "");
                return urlMap.get(key) || "";
            }
            return defaultUrlTransform(url);
        },
        [urlMap],
    );

    return (
        <article
            className={cn(
                "prose dark:prose-invert prose-img:rounded-lg prose-img:justify-self-center prose-img:max-h-[75dvh]",
                className,
            )}
            {...props}
        >
            <Markdown
                id={memoID}
                children={children.replace(/"\s*;\s*/g, '" ').trim()}
                urlTransform={urlTransform}
            />
        </article>
    );
});
