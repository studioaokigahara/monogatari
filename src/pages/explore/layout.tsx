import { useCallback, useEffect, useState } from "react";

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
};

export default function ExploreLayout() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [characterPaths, setCharacterPaths] = useState<Set<string>>(
        new Set(),
    );
    const [totalCharactersLoaded, setTotalCharactersLoaded] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [buttonStates, setButtonStates] = useState<
        Record<string, { state: ButtonState; error?: string }>
    >({});
    const [downloadQueue, setDownloadQueue] = useState<Character[]>([]);
    const [processingQueue, setProcessingQueue] = useState(false);
    const [searchOptions, setSearchOptions] =
        useState<SearchOptions>(defaultSearchOptions);

    const downloadedCharacters = useLiveQuery(
        () => db.characters.toArray(),
        [],
    );

    useEffect(() => {
        const paths = new Set<string>();

        if (downloadedCharacters === undefined) return;

        downloadedCharacters
            .filter(
                (character: any) => character.data?.extensions?.chub?.full_path,
            )
            .forEach((character: any) =>
                paths.add(character.data.extensions.chub.full_path),
            );

        console.log(paths);
        setCharacterPaths(paths);

        if (paths.size === 0) {
            toast.warning(
                "No chub info found in database. Character download button states will be broken.",
            );
        }

        setButtonStates((prev) => {
            const states = { ...prev };
            characterPaths.forEach((fullPath) => {
                if (!states[fullPath]) {
                    states[fullPath] = { state: ButtonState.READY_UPDATE };
                }
            });
            return states;
        });
    }, [downloadedCharacters]);

    const updateButtonState = useCallback(
        (fullPath: string, state: ButtonState, errorMessage = "") => {
            setButtonStates((prevStates) => ({
                ...prevStates,
                [fullPath]: { state, error: errorMessage },
            }));
        },
        [setButtonStates],
    );

    const enqueueDownload = useCallback(
        (job: Character) => {
            setDownloadQueue((jobs) => [...jobs, job]);
            updateButtonState(job.fullPath, ButtonState.IN_QUEUE);
        },
        [processingQueue, updateButtonState],
    );

    const downloadCharacter = async (job: Character) => {
        console.log("Downloading character", job.fullPath);
        const imageBlob = await fetchCharacterImage(job);
        const arrayBuffer = await imageBlob.arrayBuffer();
        const characterData = readCharacterImage(arrayBuffer);
        const json = JSON.parse(characterData);
        const record = await importCharacter(json, arrayBuffer);

        try {
            await scanGallery(record, {
                onLog: (line) => console.log(line),
                onProgress: (current, total) =>
                    console.log(`Scanning ${current / total}`),
            });
        } catch (error) {
            console.error("Gallery scan failed:", error);
        }
    };

    const processQueue = async (jobs: Character[]) => {
        console.log("Processing queue", jobs);
        setProcessingQueue(true);

        for (const job of jobs!) {
            const isUpdate = characterPaths.has(job.fullPath);
            const loadingText = isUpdate ? "Updating" : "Downloading";
            const successText = isUpdate ? "Updated" : "Downloaded";
            const errorText = isUpdate ? "Update" : "Download";

            console.debug("download started for", job.fullPath);
            updateButtonState(job.fullPath, ButtonState.DOWNLOADING);

            try {
                toast.promise(downloadCharacter(job), {
                    loading: `${loadingText} ${job.name}...`,
                    success: `${successText} ${job.name}`,
                    error: `${errorText} failed for ${job.name}`,
                });
                updateButtonState(job.fullPath, ButtonState.DONE);
                setTimeout(() => {
                    updateButtonState(job.fullPath, ButtonState.READY_UPDATE);
                }, 10000);
            } catch (error: any) {
                console.error("Download failed for", job.fullPath, error);
                updateButtonState(
                    job.fullPath,
                    ButtonState.ERROR,
                    error.message,
                );
                setTimeout(() => {
                    updateButtonState(job.fullPath, ButtonState.READY_DOWNLOAD);
                }, 10000);
            }
        }

        setDownloadQueue([]);
        setProcessingQueue(false);
    };

    useEffect(() => {
        if (downloadQueue.length === 0 || processingQueue) return;
        processQueue([...downloadQueue]);
    }, [downloadQueue, processingQueue]);

    const search = useCallback(
        async (resetList: boolean) => {
            if (resetList) {
                setCharacters([]);
                setTotalCharactersLoaded(0);
            }

            setIsLoading(true);

            try {
                const newCharacters = await fetchCharacters(searchOptions);

                setCharacters((prev) => [...prev, ...newCharacters]);
                setTotalCharactersLoaded((prev) => prev + newCharacters.length);

                if (newCharacters.length === 0) {
                    toast.error("No search results found.");
                }
            } catch (error) {
                console.error("Error fetching characters:", error);
                toast.error("Failed to fetch characters.");
            } finally {
                setIsLoading(false);
            }
        },
        [
            searchOptions,
            setCharacters,
            setTotalCharactersLoaded,
            setIsLoading,
            fetchCharacters,
        ],
    );

    const handleSearch = useCallback(
        (resetList: boolean) => {
            return toast.promise(search(resetList), {
                loading: "Searching...",
                success: "Search complete.",
                error: (error: Error) => `❌ ${error.message}`,
            });
        },
        [search, toast],
    );

    useEffect(() => {
        handleSearch(searchOptions.page === 1);
    }, [searchOptions]);

    const updateSearchOptions = useCallback(
        (newOptions: Partial<SearchOptions>) => {
            setSearchOptions((prev) => ({
                ...prev,
                ...newOptions,
            }));
        },
        [setSearchOptions],
    );

    const loadMore = useCallback(() => {
        if (isLoading) return;

        const itemsPerPage = searchOptions.itemsPerPage;
        const lastBatchCount =
            totalCharactersLoaded - (searchOptions.page - 1) * itemsPerPage;

        if (lastBatchCount < itemsPerPage) return;

        updateSearchOptions({
            page: searchOptions.page + 1,
        });
    }, [
        isLoading,
        totalCharactersLoaded,
        searchOptions.page,
        searchOptions.itemsPerPage,
        updateSearchOptions,
    ]);

    return (
        <>
            <Header />
            <SearchPanel
                searchOptions={searchOptions}
                onSearchOptionsChange={updateSearchOptions}
                onReset={() => {
                    setSearchOptions(defaultSearchOptions);
                }}
            />
            <CharacterList
                characters={characters}
                characterPaths={characterPaths}
                buttonStates={buttonStates}
                isLoading={isLoading}
                onCharacterDownload={enqueueDownload}
                onLoadMore={loadMore}
                onTagClick={(tag) => {
                    setSearchOptions((prev) => ({
                        ...prev,
                        includedTags: prev.includedTags.includes(tag)
                            ? prev.includedTags.filter((t) => t !== tag)
                            : [...prev.includedTags, tag],
                        page: 1,
                    }));
                }}
                onCreatorClick={(creator) => {
                    setSearchOptions({
                        ...defaultSearchOptions,
                        creator: creator.replace("@", ""),
                        excludedTags: [],
                        sort: "created_at",
                    });
                }}
            />
        </>
    );
}
