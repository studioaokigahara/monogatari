import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

export function useTagList(tags: string[], maxRows: number) {
    const visibleRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    const [visibleIndexes, setVisibleIndexes] = useState<number[]>(() =>
        tags.map((_, i) => i),
    );
    const [hiddenCount, setHiddenCount] = useState(0);

    const items = useMemo(
        () => tags.map((value, id) => ({ id, value })),
        [tags],
    );

    const visibleTags = useMemo(
        () => visibleIndexes.map((i) => items[i]!),
        [visibleIndexes, items],
    );

    const measure = useCallback(() => {
        const real = visibleRef.current;
        const ghost = ghostRef.current;
        if (!real || !ghost) return;

        ghost.style.width = `${real.offsetWidth}px`;

        const children = Array.from(ghost.children).filter((child) =>
            child.hasAttribute("data-index"),
        );
        if (children.length === 0) return;

        const measurements = children.map((child) => {
            const index = Number(child.getAttribute("data-index"));
            return { index, rect: child.getBoundingClientRect() };
        });

        const rows: number[][] = [];
        measurements.forEach(({ index, rect }) => {
            const row = rows.find((row) => {
                const firstRect = measurements.find(
                    (x) => x.index === row[0],
                )!.rect;
                return Math.abs(firstRect.top - rect.top) === 0;
            });
            if (row) row.push(index);
            else rows.push([index]);
        });

        const visible = rows
            .slice(0, maxRows)
            .flat()
            .sort((a, b) => a - b);

        let hiddenTags = tags.length - visible.length;

        if (hiddenTags > 0 && visible.length > 1) {
            visible.pop();
            hiddenTags += 1;
        }

        const sameTagsVisible =
            visible.length === visibleIndexes.length &&
            visible.every((v, i) => v === visibleIndexes[i]);

        if (!sameTagsVisible || hiddenTags !== hiddenCount) {
            setVisibleIndexes(visible);
            setHiddenCount(hiddenTags);
        }
    }, [tags, maxRows, setVisibleIndexes, setHiddenCount]);

    useLayoutEffect(() => {
        requestAnimationFrame(measure);
    }, [measure]);

    useEffect(() => {
        const container = visibleRef.current;
        if (!container) return;
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(measure);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [measure]);

    return {
        visibleRef,
        ghostRef,
        visibleTags,
        hiddenCount,
    };
}
