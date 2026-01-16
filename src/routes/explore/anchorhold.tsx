import Header from "@/components/header";
import { db } from "@/database/monogatari-db";
import { fetchAnchorholdConfig, fetchAnchorholdPage } from "@/lib/explore/anchorhold/api";
import AnchorholdList from "@/routes/explore/components/anchorhold/list";
import { AnchorholdSearch } from "@/routes/explore/components/anchorhold/search";
import { queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const configQuery = queryOptions({
    queryKey: ["anchorhold", "config"],
    queryFn: fetchAnchorholdConfig
});

function Anchorhold() {
    const [searchTerm, setSearchTerm] = useState("");
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const { data: config } = useQuery(configQuery);

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

    const posts =
        data?.pages
            .flat()
            .filter((post) => post.content.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];

    return (
        <div className="flex flex-col relative">
            <Header className="bg-background -mb-1" />
            <div className="sticky top-0 z-50">
                <div className="bg-background/66 backdrop-blur border rounded-xl mt-2">
                    <AnchorholdSearch onChange={handleChange} />
                </div>
            </div>
            <AnchorholdList
                posts={posts}
                isFetching={isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
            />
        </div>
    );
}

export const Route = createFileRoute("/explore/anchorhold")({
    component: Anchorhold,
    beforeLoad: () => ({
        breadcrumb: "Anchorhold"
    }),
    loader: ({ context: { queryClient } }) => {
        void queryClient.ensureQueryData(configQuery);
        return db.characters.toArray();
    }
});
