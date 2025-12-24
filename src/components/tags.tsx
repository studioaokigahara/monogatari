import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VariantProps } from "class-variance-authority";
import { useLayoutEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Skeleton } from "./ui/skeleton";

type BadgeVariants = VariantProps<typeof badgeVariants>["variant"];

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
    hiddenVariant = "outline",
    onTagClick,
    className,
    ...props
}: TagListProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [ready, setReady] = useState(false);
    const [visibleCount, setVisibleCount] = useState(tags.length);

    const hiddenCount = tags.length - visibleCount;

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const measureTags = () => {
            const width = container.clientWidth;
            if (width <= 0) return;

            const children = Array.from(container.children) as HTMLElement[];
            if (children.length === 0) return;

            const style = getComputedStyle(container);
            const rowGap = parseFloat(style.rowGap || "0");
            const firstTop = children[0].offsetTop;
            const rowHeight = children[0].offsetHeight;
            const maxTop = firstTop + (maxRows - 1) * (rowHeight + rowGap);

            let max = -1;
            for (let i = 0; i < children.length; i++) {
                if (children[i].offsetTop <= maxTop) max = i;
                else break;
            }

            if (max < 0 || max === tags.length - 1) return;

            setVisibleCount(max);
        };

        setReady(false);
        measureTags();
        setReady(true);

        const observer = new ResizeObserver(() => {
            setReady(false);
            measureTags();
            setReady(true);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, [tags, maxRows]);

    const handleTagClick = (event: React.MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        const tagValue = event.currentTarget.dataset.value!;
        onTagClick?.(event, tagValue);
    };

    const tagList = tags.map((tag, index) => (
        <Badge
            key={`${tag}-${index}`}
            data-value={tag}
            variant={variant}
            className={cn(variant === "outline" && "bg-secondary", className)}
            onClick={handleTagClick}
            {...props}
        >
            {tag}
        </Badge>
    ));

    const visibleTags = tagList.slice(0, visibleCount);

    const skeletons = Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className={`w-16 h-5.5`} />
    ));

    return (
        <>
            <div className="w-full flex flex-wrap shrink-0 gap-0.5 overflow-hidden">
                {ready ? visibleTags : skeletons}
                {ready && hiddenCount > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Badge
                                variant={hiddenVariant}
                                className={cn(
                                    hiddenVariant === "outline" &&
                                        "bg-secondary hover:brightness-150 transition-all cursor-pointer",
                                    className
                                )}
                                {...props}
                            >
                                +{hiddenCount} more
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="flex flex-wrap gap-1">
                            {tagList}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
            <div
                ref={containerRef}
                aria-hidden
                className="w-full h-0 pointer-events-none opacity-0 flex flex-wrap shrink-0 gap-0.5 overflow-hidden"
            >
                {tagList}
            </div>
        </>
    );
}
