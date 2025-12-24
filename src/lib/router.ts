import { Character } from "@/database/schema/character";
import { routeTree } from "@/lib/route-tree";
import { createRouter } from "@tanstack/react-router";

export interface Context {
    breadcrumb?: string;
    character?: Character;
}

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
        context: Context;
    }
}
