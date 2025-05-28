import { Badge, badgeVariants } from "@/components/ui/badge";
import { useTagList } from "@/hooks/use-tag-list";
import { cn } from "@/lib/utils";
import { VariantProps } from "class-variance-authority";
import { memo, useCallback } from "react";

type BadgeVariants = VariantProps<typeof badgeVariants>["variant"];

interface TagProps {
    index: number;
    value: string;
    variant?: BadgeVariants;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const Tag = memo(
    ({ index, value, variant, className, onClick, ...props }: TagProps) => {
        return (
            <Badge
                data-index={index}
                data-value={value}
                variant={variant}
                className={cn(className)}
                onClick={onClick}
                {...props}
            >
                {value}
            </Badge>
        );
    },
    (prev, next) =>
        prev.index === next.index &&
        prev.value === next.value &&
        prev.variant === next.variant &&
        prev.className === next.className &&
        prev.onClick === next.onClick
);

interface TagListProps extends React.ComponentProps<"span"> {
    tags: string[];
    maxRows?: number;
    variant?: BadgeVariants;
    hiddenVariant?: BadgeVariants;
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
        maxRows
    );

    const handleTagClick = useCallback(
        (e: React.MouseEvent<HTMLSpanElement>) => {
            e.stopPropagation();
            const tagValue = e.currentTarget.getAttribute("data-value")!;
            onTagClick?.(e, tagValue);
        },
        [onTagClick]
    );

    return (
        <>
            <div
                ref={ghostRef}
                className="invisible fixed flex flex-wrap gap-0.5"
            >
                {tags.map((tag, index) => (
                    <Tag
                        key={index}
                        index={index}
                        value={tag}
                        variant={variant}
                        className={className}
                        {...props}
                    />
                ))}
            </div>
            <div
                ref={visibleRef}
                className="flex flex-wrap gap-0.5 overflow-hidden"
            >
                {visibleTags.map((tag) => (
                    <Tag
                        key={tag.id}
                        index={tag.id}
                        value={tag.value}
                        variant={variant}
                        className={className}
                        onClick={handleTagClick}
                        {...props}
                    />
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
