import { CharacterArchiveCard } from "@/routes/explore/components/charchive/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CharacterArchiveItem } from "@/types/explore/charchive";
import { useLayoutEffect } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Activity, useEffect, useMemo, useRef, useState } from "react";

interface Props {
    items: CharacterArchiveItem[];
    isFetching: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
}

export function CharacterArchiveList({
    items,
    isFetching,
    hasNextPage,
    fetchNextPage
}: Props) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(0);

    useLayoutEffect(() => {
        if (!gridRef.current) return;
        const grid = gridRef.current;
        setGridWidth(grid.clientWidth);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setGridWidth(entry.contentRect.width);
            }
        });
        observer.observe(grid);

        return () => observer.disconnect();
    }, []);

    const columnCount = useMemo(
        () => Math.max(1, Math.floor(gridWidth / 256)),
        [gridWidth]
    );

    const rowCount = useMemo(
        () => Math.max(0, Math.ceil(items.length / columnCount)),
        [items, columnCount]
    );

    const rowVirtualizer = useWindowVirtualizer({
        count: rowCount,
        estimateSize: () => 448,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
        gap: 8
    });

    const columnVirtualizer = useWindowVirtualizer({
        count: columnCount,
        estimateSize: () => 256,
        horizontal: true
    });

    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!sentinelRef.current) return;
        const sentinel = sentinelRef.current;

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && hasNextPage && !isFetching) {
                    fetchNextPage();
                }
            }
        });
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [hasNextPage, isFetching, fetchNextPage]);

    return (
        <div
            ref={gridRef}
            className="w-full relative pt-2 pb-4 my-2"
            style={{ height: rowVirtualizer.getTotalSize() }}
        >
            {items.length === 0 && !isFetching ? (
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">
                        No results :(
                    </p>
                </div>
            ) : (
                rowVirtualizer.getVirtualItems().map((row) => (
                    <div
                        key={row.key}
                        data-index={row.index}
                        ref={rowVirtualizer.measureElement}
                        className={cn(
                            "w-full absolute top-0 left-0",
                            "grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(256px,1fr))] gap-2"
                        )}
                        style={{
                            transform: `translateY(${row.start - rowVirtualizer.options.scrollMargin}px)`
                        }}
                    >
                        {columnVirtualizer.getVirtualItems().map((column) => {
                            const item =
                                items[row.index * columnCount + column.index];

                            if (!item) return null;

                            return (
                                <div
                                    key={column.key}
                                    data-index={column.index}
                                    ref={columnVirtualizer.measureElement}
                                >
                                    <CharacterArchiveCard item={item} />
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
            <Activity mode={isFetching ? "visible" : "hidden"}>
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(256px,1fr))] gap-2">
                    {[...Array(8)].map((_, index) => (
                        <Skeleton
                            key={index}
                            className="rounded-xl w-auto h-44 md:h-96"
                        />
                    ))}
                </div>
            </Activity>
            <div
                ref={sentinelRef}
                className="h-1 col-span-1"
                style={{
                    transform: `translateY(${rowVirtualizer.getTotalSize()}px)`
                }}
            />
        </div>
    );
}
