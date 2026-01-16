import Header from "@/components/header";
import { db } from "@/database/monogatari-db";
import { fetchCharacters } from "@/lib/explore/chub/api";
import CharacterList from "@/routes/explore/components/chub/list";
import SearchPanel from "@/routes/explore/components/chub/search";
import { type ChubCharacter, type SearchOptions } from "@/types/explore/chub";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const DefaultSearchOptions: SearchOptions = {
    searchTerm: "",
    creator: "",
    namespace: "characters",
    includedTags: "",
    excludedTags: "ntr",
    nsfw: true,
    itemsPerPage: 24,
    sort: "trending_downloads",
    sortAscending: false,
    page: 1,
    inclusiveOr: false
};

function getQueryOptions(searchOptions: SearchOptions) {
    return infiniteQueryOptions({
        queryKey: ["exploreCharacters", searchOptions],
        queryFn: ({ pageParam }) => fetchCharacters({ ...searchOptions, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
            lastPage.length < searchOptions.itemsPerPage ? undefined : lastPageParam + 1,
        staleTime: 60_000
    });
}

function Chub() {
    const [searchOptions, setSearchOptions] = useState<SearchOptions>(DefaultSearchOptions);

    const updateSearchOptions = (options: Partial<SearchOptions>) => {
        setSearchOptions((prev) => ({
            ...prev,
            ...options
        }));
    };

    const resetSearchOptions = () => setSearchOptions(DefaultSearchOptions);

    const queryOptions = getQueryOptions(searchOptions);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
        useInfiniteQuery(queryOptions);

    const characters: ChubCharacter[] = data?.pages.flat() ?? [];

    const handleTagClick = (newTag: string) => {
        setSearchOptions((prev) => ({
            ...prev,
            includedTags: prev.includedTags.includes(newTag)
                ? prev.includedTags
                      .split(", ")
                      .filter((tag) => tag !== newTag)
                      .join(", ")
                : [...prev.includedTags.split(", "), newTag].join(", "),
            page: 1
        }));
    };

    const handleCreatorClick = (creator: string) => {
        setSearchOptions({
            ...DefaultSearchOptions,
            creator: creator.replace("@", ""),
            excludedTags: "",
            sort: "created_at"
        });
    };

    return (
        <div className="flex flex-col relative">
            <Header className="bg-background -mb-1" />
            <div className="sticky top-0 z-50">
                <div className="bg-background/66 backdrop-blur border rounded-xl mt-2">
                    <SearchPanel
                        searchOptions={searchOptions}
                        onSearchOptionsChange={updateSearchOptions}
                        onReset={resetSearchOptions}
                    />
                </div>
            </div>
            <CharacterList
                characters={characters}
                isFetching={isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                onTagClick={handleTagClick}
                onCreatorClick={handleCreatorClick}
            />
        </div>
    );
}

export const Route = createFileRoute("/explore/chub")({
    component: Chub,
    beforeLoad: () => ({
        breadcrumb: "Character Hub"
    }),
    loader: ({ context: { queryClient } }) => {
        const queryOptions = getQueryOptions(DefaultSearchOptions);
        void queryClient.ensureInfiniteQueryData(queryOptions);
        return db.characters.toArray();
    }
});
