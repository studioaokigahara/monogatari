import { useCallback, useMemo, useState } from "react";

import { db } from "@/database/database";
import { importCharacter, readCharacterImage } from "@/lib/character/io";
import { fetchCharacterImage, fetchCharacters } from "@/lib/explore/chub/api";
import {
    ButtonState,
    type ChubCharacter,
    type SearchOptions
} from "@/types/explore/chub";
import { useLiveQuery } from "dexie-react-hooks";

import SearchPanel from "@/routes/explore/components/chub/search";
import Header from "@/components/header";
import { scanGallery } from "@/lib/character/scanner";
import { toast } from "sonner";
import CharacterList from "./list";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

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

export default function ChubLayout() {
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

    const characters: ChubCharacter[] = useMemo(
        () => (data?.pages ?? []).flat(),
        [data]
    );

    const downloadMutation = useMutation({
        mutationFn: async (job: ChubCharacter) => {
            const isUpdate = characterPaths.has(job.fullPath);

            updateButtonState(
                job.fullPath,
                isUpdate ? ButtonState.DOWNLOADING : ButtonState.IN_QUEUE
            );

            const imageBlob = await fetchCharacterImage(job);
            const arrayBuffer = await imageBlob.arrayBuffer();
            const characterData = readCharacterImage(arrayBuffer);
            const json = JSON.parse(characterData);

            json.data.extensions.chub = {
                ...json.data.extensions.chub,
                full_path: job.fullPath
            };

            json.data.extensions.monogatari = {
                ...json.data.extensions.monogatari,
                tagline: job.tagline
            };

            const record = await importCharacter(json, arrayBuffer);

            if (!record) return { job, isUpdate };

            await scanGallery(record).catch((error: Error) => {
                console.error("Gallery scan failed:", error);
                toast.error("Gallery scan failed", {
                    description: error.message
                });
            });

            return { job, isUpdate };
        },
        onMutate: ({ fullPath }: ChubCharacter) => {
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

    const enqueueDownload = (job: ChubCharacter) => {
        downloadMutation.mutate(job);
    };

    const resetSearchOptions = () => setSearchOptions(defaultSearchOptions);

    const updateSearchTags = (tag: string) => {
        setSearchOptions((prev) => ({
            ...prev,
            includedTags: prev.includedTags.includes(tag)
                ? prev.includedTags.filter((t) => t !== tag)
                : [...prev.includedTags, tag],
            page: 1
        }));
    };

    const updateSearchCreator = (creator: string) => {
        setSearchOptions({
            ...defaultSearchOptions,
            creator: creator.replace("@", ""),
            excludedTags: [],
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
                characterPaths={characterPaths}
                buttonStates={buttonStates}
                isFetching={isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                onCharacterDownload={enqueueDownload}
                onTagClick={updateSearchTags}
                onCreatorClick={updateSearchCreator}
            />
        </div>
    );
}
