import Header from "@/components/header";
import { db } from "@/database/monogatari-db";
import { fetchAnchorholdConfig, fetchAnchorholdPage } from "@/lib/explore/anchorhold/api";
import AnchorholdList from "@/routes/explore/components/anchorhold/list";
import { AnchorholdSearch } from "@/routes/explore/components/anchorhold/search";
import { queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import z from "zod";

const configQuery = queryOptions({
    queryKey: ["anchorhold", "config"],
    queryFn: fetchAnchorholdConfig
});

function Anchorhold() {
    const { data: config, isFetching: isFetchingConfig } = useQuery(configQuery);

    const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ["anchorhold", "feed"],
        queryFn: ({ pageParam }) => fetchAnchorholdPage(pageParam),
        initialPageParam: config?.total_pages ?? 1,
        getNextPageParam: (_lastPage, _allPages, lastPageParam) => {
            const current = lastPageParam ?? 1;
            return current > 1 ? current - 1 : undefined;
        },
        enabled: !!config
    });

    const { search } = useSearch({ from: "/explore/anchorhold" });

    const posts =
        data?.pages
            .flat()
            .filter((post) => post.content.toLowerCase().includes(search?.toLowerCase() ?? "")) ??
        [];

    return (
        <div className="relative flex flex-col">
            <Header className="-mb-1 bg-background" />
            <div className="sticky top-0 z-50">
                <div className="mt-2 rounded-xl border bg-background/66 backdrop-blur">
                    <AnchorholdSearch />
                </div>
            </div>
            <AnchorholdList
                posts={posts}
                isFetching={isFetchingConfig || isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
            />
        </div>
    );
}

export const Route = createFileRoute("/explore/anchorhold")({
    component: Anchorhold,
    validateSearch: z.object({
        search: z.string().optional()
    }),
    beforeLoad: () => ({
        breadcrumb: "Anchorhold"
    }),
    loader: ({ context: { queryClient } }) => {
        void queryClient.ensureQueryData(configQuery);
        return db.characters.toArray();
    }
});
