import Header from "@/components/header";
import { db } from "@/database/monogatari-db";
import { fetchCharacters } from "@/lib/explore/chub/api";
import CharacterList from "@/routes/explore/components/chub/list";
import SearchPanel from "@/routes/explore/components/chub/search";
import { type ChubCharacter, SearchOptions } from "@/types/explore/chub";
import { infiniteQueryOptions, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate, useSearch } from "@tanstack/react-router";

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
        queryKey: ["explore", "chub", searchOptions],
        queryFn: ({ pageParam }) => fetchCharacters({ ...searchOptions, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
            return lastPage.length < searchOptions.itemsPerPage ? undefined : lastPageParam + 1;
        },
        refetchOnWindowFocus: false
    });
}

function Chub() {
    const searchOptions = useSearch({ from: "/explore/chub" });
    const navigate = useNavigate({ from: "/explore/chub" });
    const queryClient = useQueryClient();

    const updateSearchOptions = (options: Partial<SearchOptions>) => {
        void navigate({
            search: (prev) => ({
                ...prev,
                ...options
            })
        });
    };

    const resetSearchOptions = () => {
        void queryClient.invalidateQueries({ queryKey: ["explore", "chub"] });
        void navigate({ search: DefaultSearchOptions });
    };

    const queryOptions = getQueryOptions(searchOptions);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
        useInfiniteQuery(queryOptions);

    const characters: ChubCharacter[] = data?.pages.flat() ?? [];

    const handleTagClick = (newTag: string) => {
        void navigate({
            search: (prev) => ({
                ...prev,
                includedTags: prev.includedTags.includes(newTag)
                    ? prev.includedTags
                          .split(", ")
                          .filter((tag) => tag !== newTag)
                          .join(", ")
                    : [...prev.includedTags.split(", "), newTag].join(", "),
                page: 1
            })
        });
    };

    return (
        <div className="relative flex flex-col">
            <Header className="-mb-1 bg-background" />
            <div className="sticky top-0 z-50">
                <div className="mt-2 rounded-xl">
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
            />
        </div>
    );
}

export const Route = createFileRoute("/explore/chub")({
    component: Chub,
    validateSearch: SearchOptions,
    beforeLoad: () => ({
        breadcrumb: "Character Hub"
    }),
    loader: ({ context: { queryClient } }) => {
        const queryOptions = getQueryOptions(DefaultSearchOptions);
        void queryClient.ensureInfiniteQueryData(queryOptions);
        return db.characters.toArray();
    },
    search: {
        middlewares: [
            stripSearchParams({
                ...DefaultSearchOptions,
                excludedTags: ""
            })
        ]
    }
});
