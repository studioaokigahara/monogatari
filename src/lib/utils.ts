import { init } from "@paralleldrive/cuid2";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const generateCuid2 = init({ length: 16 });

export function debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
        console.log(message, ...args);
    }
}

export function FNV1a(string: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < string.length; i++) {
        hash ^= string.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    hash = hash >>> 0;
    return hash / 0x100000000;
}

export function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * @author VisioN
 * @link https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504 
 * @retrieved 2026-01-12
 * @license CC BY-SA 4.0
 */
export function getFileExtension(filename: string) {
    const extension = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
    return extension.trim() ? extension : "unknown";
}
