import Header from "@/components/header";
import {
    fetchAnchorholdConfig,
    fetchAnchorholdPage
} from "@/lib/explore/anchorhold/api";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AnchorholdList from "./list";
import { AnchorholdSearch } from "@/routes/explore/components/anchorhold/search";
import useEvent from "react-use-event-hook";

export default function AnchorholdLayout() {
    const [searchTerm, setSearchTerm] = useState("");

    const search = useEvent((event: React.ChangeEvent<HTMLInputElement>) =>
        setSearchTerm(event.target.value)
    );

    const { data: config, isLoading } = useQuery({
        queryKey: ["anchorhold", "config"],
        queryFn: fetchAnchorholdConfig
    });

    const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ["anchorhold", "feed"],
            queryFn: ({ pageParam }) => fetchAnchorholdPage(pageParam),
            initialPageParam: config?.total_pages ?? 1,
            getNextPageParam: (_lastPage, _allPages, lastPageParam) => {
                const current = lastPageParam ?? 1;
                return current > 1 ? current - 1 : undefined;
            },
            enabled: !!config || !isLoading
        });

    const posts =
        data?.pages
            .flat()
            .filter((data) =>
                data.content.toLowerCase().includes(searchTerm.toLowerCase())
            ) ?? [];

    return (
        <div className="flex flex-col relative">
            <Header className="bg-background -mb-1" />
            <div className="sticky top-0 z-50">
                <div className="bg-background/66 backdrop-blur border rounded-xl mt-2">
                    <AnchorholdSearch search={search} />
                </div>
            </div>
            <AnchorholdList
                posts={posts}
                isFetching={isLoading || isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
            />
        </div>
    );
}
