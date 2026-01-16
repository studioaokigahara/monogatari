interface PaginationRange {
    page: number;
    totalPages: number;
    siblingCount?: number;
    endCount?: number;
}

type PaginationRangeItem = number | "ellipsis";

export function usePaginationRange({
    page,
    totalPages,
    siblingCount = 1,
    endCount = 1
}: PaginationRange): PaginationRangeItem[] {
    const range = (start: number, end: number) => {
        const s = Math.min(start, end);
        const e = Math.max(start, end);
        return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    };

    const totalNumbers = endCount * 2 + siblingCount * 2 + 3;
    if (totalPages <= totalNumbers) return range(1, totalPages);

    const leftSiblingIndex = Math.max(page - siblingCount, endCount + 2);
    const rightSiblingIndex = Math.min(
        page + siblingCount,
        totalPages - endCount - 1
    );

    const leftEllipsis = leftSiblingIndex > endCount + 2;
    const rightEllipsis = rightSiblingIndex < totalPages - endCount - 1;

    const startPages = range(1, endCount);
    const endPages = range(totalPages - endCount + 1, totalPages);

    if (!leftEllipsis && rightEllipsis) {
        const leftItemCount = endCount + siblingCount * 2 + 1;
        const leftRange = range(1, leftItemCount);
        return [...leftRange, "ellipsis", ...endPages];
    }

    if (leftEllipsis && !rightEllipsis) {
        const rightItemCount = endCount + siblingCount * 2 + 1;
        const rightRange = range(totalPages - rightItemCount + 1, totalPages);
        return [...startPages, "ellipsis", ...rightRange];
    }

    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [...startPages, "ellipsis", ...middleRange, "ellipsis", ...endPages];
}
