import { useCallback, useEffect, useMemo, useState } from "react";

import { db } from "@/database/database";
import { importCharacter, readCharacterImage } from "@/lib/character/utils";
import { fetchCharacterImage, fetchCharacters } from "@/lib/chub/api";
import { ButtonState, type Character, type SearchOptions } from "@/types/chub";
import { useLiveQuery } from "dexie-react-hooks";

import SearchPanel from "@/components/explore/search";
import Header from "@/components/header";
import { scanGallery } from "@/lib/character/scanner";
import { toast } from "sonner";
import CharacterList from "./list";
import {
    useInfiniteQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";

const defaultSearchOptions: SearchOptions = {
    searchTerm: "",
    creator: "",
    namespace: "characters",
    includedTags: [],
    excludedTags: ["ntr"],
    nsfw: true,
    itemsPerPage: 24,
    sort: "trending_downloads",
    sortAscending: false,
    page: 1,
    inclusiveOr: false
};

export default function ExploreLayout() {
    const [buttonStates, setButtonStates] = useState<
        Record<string, { state: ButtonState; error?: string }>
    >({});

    const updateButtonState = useCallback(
        (fullPath: string, state: ButtonState, errorMessage = "") => {
            setButtonStates((prevStates) => ({
                ...prevStates,
                [fullPath]: { state, error: errorMessage }
            }));
        },
        []
    );

    const downloadedCharacters = useLiveQuery(
        () => db.characters.toArray(),
        []
    );

    const characterPaths = useMemo(() => {
        const paths = new Set<string>();

        if (downloadedCharacters === undefined) return paths;

        downloadedCharacters
            .filter(
                (character: any) => character.data?.extensions?.chub?.full_path
            )
            .forEach((character: any) =>
                paths.add(character.data.extensions.chub.full_path)
            );

        console.log(paths);

        if (paths.size === 0) {
            toast.warning(
                "No chub info found in database. Character download button states will be broken."
            );
        }

        setButtonStates((prev) => {
            const states = { ...prev };
            paths.forEach((fullPath) => {
                if (!states[fullPath]) {
                    states[fullPath] = { state: ButtonState.READY_UPDATE };
                }
            });
            return states;
        });

        return paths;
    }, [downloadedCharacters]);

    const [searchOptions, setSearchOptions] =
        useState<SearchOptions>(defaultSearchOptions);

    const updateSearchOptions = useCallback(
        (options: Partial<SearchOptions>) => {
            setSearchOptions((prev) => ({
                ...prev,
                ...options
            }));
        },
        []
    );

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
        useInfiniteQuery({
            queryKey: ["exploreCharacters", searchOptions],
            queryFn: ({ pageParam }) =>
                fetchCharacters({ ...searchOptions, page: pageParam }),
            initialPageParam: 1,
            getNextPageParam: (lastPage, _allPages, lastPageParam) =>
                lastPage.length < searchOptions.itemsPerPage
                    ? undefined
                    : lastPageParam + 1,
            staleTime: 60_000
        });

    const characters: Character[] = useMemo(
        () => (data?.pages ?? []).flat(),
        [data]
    );

    const downloadMutation = useMutation({
        mutationFn: async (job: Character) => {
            const isUpdate = characterPaths.has(job.fullPath);

            updateButtonState(
                job.fullPath,
                isUpdate ? ButtonState.DOWNLOADING : ButtonState.IN_QUEUE
            );

            const imageBlob = await fetchCharacterImage(job);
            const arrayBuffer = await imageBlob.arrayBuffer();
            const characterData = readCharacterImage(arrayBuffer);
            const json = JSON.parse(characterData);
            const record = await importCharacter(json, arrayBuffer);

            try {
                await scanGallery(record, {
                    onLog: (line) => console.log(line),
                    onProgress: (current, total) =>
                        console.log(`Scanning ${current / total}`)
                });
            } catch (error) {
                console.error("Gallery scan failed:", error);
            }

            return { job, isUpdate };
        },
        onMutate: ({ fullPath }: Character) => {
            updateButtonState(fullPath, ButtonState.DOWNLOADING);
        },
        onSuccess: ({ job, isUpdate }) => {
            updateButtonState(job.fullPath, ButtonState.DONE);
            toast.success(`${isUpdate ? "Updated" : "Downloaded"} ${job.name}`);
        },
        onError: (error: any, job) => {
            console.error("Download failed for", job.fullPath, error);
            updateButtonState(job.fullPath, ButtonState.ERROR, error.message);
            toast.error(`Download failed for ${job.name}`);
        },
        onSettled: (_, __, job) => {
            setTimeout(() => {
                const next =
                    buttonStates[job.fullPath]?.state === ButtonState.ERROR
                        ? ButtonState.READY_DOWNLOAD
                        : ButtonState.READY_UPDATE;
                updateButtonState(job.fullPath, next);
            }, 15_000);
        }
    });

    const enqueueDownload = useCallback(
        (job: Character) => {
            downloadMutation.mutate(job);
        },
        [downloadMutation]
    );

    const loadMore = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-col relative">
            <div className="sticky top-0 z-50">
                <Header className="bg-background -mb-1" />
                <div className="bg-background/66 backdrop-blur border rounded-xl">
                    <SearchPanel
                        searchOptions={searchOptions}
                        onSearchOptionsChange={updateSearchOptions}
                        onReset={() => {
                            setSearchOptions(defaultSearchOptions);
                        }}
                    />
                </div>
            </div>
            <CharacterList
                characters={characters}
                characterPaths={characterPaths}
                buttonStates={buttonStates}
                isLoading={isFetching || isFetchingNextPage}
                onCharacterDownload={enqueueDownload}
                onLoadMore={loadMore}
                onTagClick={(tag) => {
                    setSearchOptions((prev) => ({
                        ...prev,
                        includedTags: prev.includedTags.includes(tag)
                            ? prev.includedTags.filter((t) => t !== tag)
                            : [...prev.includedTags, tag],
                        page: 1
                    }));
                }}
                onCreatorClick={(creator) => {
                    setSearchOptions({
                        ...defaultSearchOptions,
                        creator: creator.replace("@", ""),
                        excludedTags: [],
                        sort: "created_at"
                    });
                }}
            />
        </div>
    );
}
