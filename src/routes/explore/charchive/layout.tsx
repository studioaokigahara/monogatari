import Header from "@/components/header";
import { fetchCharacterArchiveItems } from "@/lib/explore/chararchive/api";
import { CharacterArchiveQuery } from "@/types/explore/charchive";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CharacterArchiveList } from "./list";
import { CharacterArchiveSearch } from "@/routes/explore/components/charchive/search";

const defaultQuery = CharacterArchiveQuery.parse({});

export function CharacterArchiveExplorer() {
    const [query, setQuery] = useState<CharacterArchiveQuery>(defaultQuery);
    const updateQuery = (update: Partial<CharacterArchiveQuery>) => {
        setQuery((prev) => ({
            ...prev,
            ...update
        }));
    };

    const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ["char-archive", query],
            queryFn: ({ pageParam }) =>
                fetchCharacterArchiveItems({ ...query, page: pageParam }),
            initialPageParam: 1,
            getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
                lastPageParam + 1
        });

    const items = data?.pages.flat() ?? [];

    return (
        <div className="flex flex-col relative">
            <Header className="bg-background -mb-1" />
            <div className="sticky top-0 z-50">
                <div className="bg-background/66 backdrop-blur border rounded-xl mt-2">
                    <CharacterArchiveSearch
                        query={query}
                        updateQuery={updateQuery}
                        resetQuery={() => setQuery(defaultQuery)}
                    />
                </div>
            </div>
            <CharacterArchiveList
                items={items}
                isFetching={isFetching || isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
            />
        </div>
    );
}
