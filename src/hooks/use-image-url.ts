import { useEffect, useState } from "react";

interface Cached {
    url: string;
    refCount: number;
}

const blobUrlCache = new WeakMap<Blob, Cached>();

function createCachedUrl(blob: Blob): string {
    let entry = blobUrlCache.get(blob);
    if (entry) {
        entry.refCount += 1;
        return entry.url;
    }
    const url = URL.createObjectURL(blob);
    entry = { url, refCount: 1 };
    blobUrlCache.set(blob, entry);
    return url;
}

function revokeCachedUrl(blob: Blob) {
    const entry = blobUrlCache.get(blob);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        blobUrlCache.delete(blob);
    }
}

// Overload signatures
export function useImageURL(data: Blob): string;
export function useImageURL(data: Blob[]): string[];

export function useImageURL(
    data: Blob | Blob[] | ArrayBuffer,
): string | string[] {
    const [imageURL, setImageURL] = useState<string | string[]>([]);

    useEffect(() => {
        let blobs: Blob[];

        if (Array.isArray(data)) {
            blobs = data.map((d) => (d instanceof Blob ? d : new Blob([d])));
        } else {
            blobs = [data instanceof Blob ? data : new Blob([data])];
        }

        const urls = blobs.map(createCachedUrl);
        setImageURL(Array.isArray(data) ? urls : urls[0]);

        // urls.forEach((url) => {
        //     const image = new Image();
        //     image.loading = "eager";
        //     image.fetchPriority = "high";
        //     image.src = url;
        // });

        return () => {
            blobs.forEach(revokeCachedUrl);
        };
    }, [data]);

    return imageURL;
}
