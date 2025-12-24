import { cn } from "@/lib/utils";
import { useId as useID } from "react";
import { Markdown } from "./markdown";

interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
    id?: string;
    children: string;
    streaming?: boolean;
}

export function Prose({
    id,
    children,
    streaming = false,
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
            <Markdown id={memoID} content={children} streaming={streaming} />
        </article>
    );
}
