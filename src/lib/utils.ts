import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { init } from "@paralleldrive/cuid2";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const generateCuid2 = init({ length: 16 });

export function debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
        console.log(message, ...args);
    }
}
