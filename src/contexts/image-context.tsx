import { createContext, useContext, useEffect, useState } from "react";

interface Cached {
    url: string;
    refCount: number;
}
const cache = new WeakMap<Blob, Cached>();

function getURL(blob: Blob) {
    let entry = cache.get(blob);
    if (entry) {
        entry.refCount++;
        return entry.url;
    }
    console.log(blob);
    const url = URL.createObjectURL(blob);
    entry = { url, refCount: 1 };
    cache.set(blob, entry);
    return url;
}

function revokeURL(blob: Blob) {
    const entry = cache.get(blob);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        cache.delete(blob);
    }
}

interface ImageContext {
    getURL: (blob: Blob) => string;
    revokeURL: (blob: Blob) => void;
}

const ImageContext = createContext({
    getURL: (blob: Blob) => getURL(blob),
    revokeURL: (blob: Blob) => revokeURL(blob)
});

export function ImageProvider({ children }: { children: React.ReactNode }) {
    return (
        <ImageContext.Provider value={{ getURL: getURL, revokeURL: revokeURL }}>
            {children}
        </ImageContext.Provider>
    );
}

export function useImageContext(): ImageContext {
    const context = useContext(ImageContext);
    if (!context) {
        throw new Error("useImageContext must be used inside ImageProvider");
    }
    return context;
}

/* Overload signatures */
export function useImageURL(data: Blob): string;
export function useImageURL(data: Blob[]): string[];
export function useImageURL(data: Blob | Blob[]): string | string[] {
    const { getURL, revokeURL } = useContext(ImageContext);
    const isArray = Array.isArray(data);
    const [imageURL, setImageURL] = useState<string | string[]>(
        isArray ? [] : ""
    );

    useEffect(() => {
        const buffers = isArray ? (data as Blob[]) : [data as Blob];
        const blobs = buffers.map((d) =>
            d instanceof Blob ? d : new Blob([d])
        );
        const urls = blobs.map(getURL);
        setImageURL(isArray ? urls : urls[0]);

        return () => {
            blobs.forEach(revokeURL);
        };
    }, [data, getURL, revokeURL, isArray]);

    return imageURL;
}
