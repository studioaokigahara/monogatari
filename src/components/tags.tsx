import { Badge } from "@/components/ui/badge";
import { useTagList } from "@/hooks/use-tag-list";
import { cn } from "@/lib/utils";

interface TagListProps extends React.ComponentProps<"span"> {
    tags: string[];
    maxRows?: number;
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | null
        | undefined;
    hiddenVariant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | null
        | undefined;
    onTagClick?: (e: React.MouseEvent<HTMLSpanElement>, tag: string) => void;
}

export function TagList({
    tags,
    maxRows = 2,
    variant = "outline",
    hiddenVariant = "secondary",
    onTagClick,
    className,
    ...props
}: TagListProps) {
    const { visibleRef, ghostRef, visibleTags, hiddenCount } = useTagList(
        tags,
        maxRows,
    );

    return (
        <>
            <div
                ref={ghostRef}
                className={`invisible fixed flex flex-wrap gap-0.5`}
            >
                {tags.map((tag, index) => (
                    <Badge
                        key={index}
                        data-index={index}
                        variant={variant}
                        className={cn(className)}
                        {...props}
                    >
                        {tag}
                    </Badge>
                ))}
            </div>
            <div
                ref={visibleRef}
                className={`flex flex-wrap gap-0.5 overflow-hidden`}
            >
                {visibleTags.map((tag) => (
                    <Badge
                        key={tag.id}
                        data-index={tag.id}
                        variant={variant}
                        className={cn(className)}
                        {...props}
                        onClick={(e) => {
                            e.stopPropagation();
                            onTagClick?.(e, tag.value);
                        }}
                    >
                        {tag.value}
                    </Badge>
                ))}
                {hiddenCount > 0 && (
                    <Badge
                        variant={hiddenVariant}
                        className={cn("", className)}
                        {...props}
                    >
                        +{hiddenCount} more
                    </Badge>
                )}
            </div>
        </>
    );
}
