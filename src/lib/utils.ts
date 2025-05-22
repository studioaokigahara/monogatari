import { type ClassValue, clsx } from "clsx";
import { customAlphabet } from "nanoid";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
        console.log(message, ...args);
    }
}

export function ThrowError(message: string, error?: Error): never {
    const errorString = error ? `${message}: ${error}` : `${message}`;
    console.error(errorString);
    toast.error(errorString);
    throw new Error(errorString);
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// const BASE62 =
//     "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
export const nanoid = customAlphabet(BASE36, 16);

export function formatNumber(num: number) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function decodeBase64(base64: string): string {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

export function encodeBase64(string: string): string {
    const bytes = new TextEncoder().encode(string);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}
