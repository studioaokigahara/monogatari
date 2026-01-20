import { Character } from "@/database/schema/character";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "@/route-tree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

export interface Context {
    queryClient: QueryClient;
    breadcrumb?: string;
    character?: Character;
}

export const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultStructuralSharing: true,
    context: { queryClient },
    scrollRestoration: true,
    Wrap: ({ children }) => {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
        context: Context;
    }
}
