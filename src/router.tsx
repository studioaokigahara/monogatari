import { Character } from "@/database/schema/character";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "@/route-tree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouteMask, createRouter } from "@tanstack/react-router";

export interface Context {
    queryClient: QueryClient;
    breadcrumb?: string;
    character?: Character;
}

const exploreChubMask = createRouteMask({
    routeTree,
    from: "/explore/chub",
    to: "/explore"
});

const exploreAnchorholdMask = createRouteMask({
    routeTree,
    from: "/explore/anchorhold",
    to: "/explore"
});

export const router = createRouter({
    routeTree,
    routeMasks: [exploreChubMask, exploreAnchorholdMask],
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
