import { DefaultOptions, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
            staleTime: 5_000 * 60
        }
    } satisfies DefaultOptions
});
