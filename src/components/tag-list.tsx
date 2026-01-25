import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, FNV1a } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useLayoutEffect, useRef, useState, useTransition } from "react";

const TAG_CACHE = new Map<string, number>();

interface TagListProps extends React.ComponentProps<typeof Badge> {
    tags: string[];
    maxRows?: number;
    onTagClick?: (event: React.MouseEvent<HTMLSpanElement>, tag: string) => void;
}

export function TagList({
    tags,
    maxRows = 2,
    variant = "outline",
    className = "bg-secondary",
    onTagClick,
    ...props
}: TagListProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const [visibleCount, setVisibleCount] = useState(tags.length);
    const hiddenCount = tags.length - visibleCount;
    const tagSignature = FNV1a(tags.join("\u001f"));

    const [isPending, startTransition] = useTransition();

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let raf = 0;

        const updateWidth = () => {
            const next = container.clientWidth;
            if (next <= 0) return;
            setContainerWidth((prev) => (prev === next ? prev : next));
        };

        updateWidth();

        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(updateWidth);
        });

        observer.observe(container);

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, []);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || containerWidth <= 0) return;

        const key = `${tagSignature}::${containerWidth}::${maxRows}::${variant}::${className}`;
        const cached = TAG_CACHE.get(key);

        if (cached !== undefined) {
            const next = Math.min(cached, tags.length);
            setVisibleCount((prev) => (prev === next ? prev : next));
            return;
        }

        const getVisibleCount = (container: HTMLDivElement) => {
            const children = Array.from(container.children) as HTMLElement[];
            if (children.length === 0) return tags.length;

            const style = getComputedStyle(container);
            const rowGap = parseFloat(style.rowGap || "0");
            const firstTop = children[0].offsetTop;
            const rowHeight = children[0].offsetHeight;
            const maxTop = firstTop + (maxRows - 1) * (rowHeight + rowGap);

            let maxIndex = -1;
            for (let i = 0; i < children.length; i++) {
                if (children[i].offsetTop <= maxTop) maxIndex = i;
                else break;
            }

            const maxCount = maxIndex + 1;
            const allTagsFit = maxCount >= tags.length;

            // reserve 1 slot for the "X more" badge
            const visibleCount = allTagsFit ? tags.length : Math.max(0, maxCount - 1);

            return Math.min(visibleCount, tags.length);
        };

        startTransition(() => {
            const next = getVisibleCount(container);
            TAG_CACHE.set(key, next);
            setVisibleCount((prev) => (prev === next ? prev : next));
        });
    }, [containerWidth, tagSignature, maxRows, variant, className, tags.length]);

    const handleTagClick = (event: React.MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        const tagValue = event.currentTarget.dataset.tag!;
        onTagClick?.(event, tagValue);
    };

    const tagList = tags.map((tag, index) => (
        <Badge
            key={`${tag}-${index}`}
            data-tag={tag}
            variant={variant}
            className={className}
            onClick={handleTagClick}
            {...props}
        >
            {tag}
        </Badge>
    ));

    const visibleTags = tagList.slice(0, visibleCount);
    const hiddenTags = tagList.slice(visibleCount);

    const skeletons = Array.from({ length: 4 * maxRows }).map((_, index) => (
        <Skeleton key={`skeleton-${index}`} className="h-5.5 w-16 rounded-full" />
    ));

    return (
        <>
            <div className="flex w-full shrink-0 flex-wrap gap-0.5 overflow-hidden">
                {!isPending ? visibleTags : skeletons}
                {!isPending && hiddenCount > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Badge
                                variant={variant}
                                className={cn(
                                    "hover:brightness-150 transition-all cursor-pointer",
                                    className
                                )}
                                {...props}
                            >
                                <MoreHorizontal />
                                {hiddenCount} more
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="flex flex-wrap gap-1">
                            {hiddenTags}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
            <div
                ref={containerRef}
                aria-hidden
                className="pointer-events-none flex h-0 w-full shrink-0 flex-wrap gap-1 overflow-hidden opacity-0"
            >
                {tagList}
            </div>
        </>
    );
}
