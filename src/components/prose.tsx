import { cn } from "@/lib/utils";
import { memo, useId as useID } from "react";
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
    const generatedID = useID();
    const memoID = id ?? generatedID;

    return (
        <article
            className={cn(
                "prose dark:prose-invert prose-img:rounded-lg prose-img:justify-self-center prose-img:max-h-[75dvh]",
                className
            )}
            {...props}
        >
            <Markdown
                id={memoID}
                children={children.replace(/"\s*;\s*/g, '" ').trim()}
            />
        </article>
    );
});
