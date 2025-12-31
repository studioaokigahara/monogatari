import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/database/monogatari-db";
import { useMobile } from "@/hooks/use-mobile";
import { importCharacter, readCharacterImage } from "@/lib/character/io";
import { scanGallery } from "@/lib/character/scanner";
import { AnchorholdPost } from "@/lib/explore/anchorhold/api";
import { fetchCharacterJSON } from "@/lib/explore/chub/api";
import AnchorholdCard from "@/routes/explore/components/anchorhold/card";
import { ButtonState, ChubCharacterResponse } from "@/types/explore/chub";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
    posts: AnchorholdPost[];
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
}

export default function AnchorholdList({
    posts,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
}: Props) {
    const [buttonStates, setButtonStates] = useState<
        Record<string, { state: ButtonState; error?: string }>
    >({});

    const updateButtonState = (
        id: string,
        state: ButtonState,
        errorMessage = ""
    ) => {
        setButtonStates((prevStates) => ({
            ...prevStates,
            [id]: { state, error: errorMessage }
        }));
    };

    const downloadedCharacters = useLiveQuery(
        () => db.characters.toArray(),
        []
    );

    const { anchorholdIDs, chubFullPaths } = useMemo(() => {
        const anchorholdSet = new Set<string>();
        const chubSet = new Set<string>();

        if (downloadedCharacters === undefined)
            return { anchorholdIDs: anchorholdSet, chubFullPaths: chubSet };

        for (const character of downloadedCharacters) {
            const id = character?.data?.extensions?.anchorhold?.id;
            if (id) anchorholdSet.add(id);
            const fullPath = character?.data?.extensions?.chub?.full_path;
            if (fullPath) chubSet.add(fullPath);
        }

        if (anchorholdSet.size === 0 && chubSet.size === 0) {
            toast.warning(
                "No Anchorhold IDs or chub.ai paths found in database. Character download button states will be broken."
            );
        }

        return { anchorholdIDs: anchorholdSet, chubFullPaths: chubSet };
    }, [downloadedCharacters]);

    const chubCharacters = useMemo(() => {
        const fullPaths = new Map<string, string>();
        for (const post of posts) {
            for (const link of post.links) {
                if (link.href.includes("chub.ai")) {
                    const path = link.href.split("characters/")[1];
                    if (path) fullPaths.set(post.id, path);
                    break;
                }
            }
        }
        return fullPaths;
    }, [posts]);

    const getDefaultButtonState = (id: string): ButtonState => {
        if (anchorholdIDs.has(id)) return ButtonState.READY_UPDATE;

        const fullPath = chubCharacters.get(id);
        if (fullPath && chubFullPaths.has(fullPath)) {
            return ButtonState.READY_UPDATE;
        }

        return ButtonState.READY_DOWNLOAD;
    };

    const navigate = useNavigate();

    const downloadMutation = useMutation({
        mutationFn: async (post: AnchorholdPost) => {
            const fullPath = chubCharacters.get(post.id);
            const isUpdate =
                anchorholdIDs.has(post.id) ||
                (fullPath ? chubFullPaths.has(fullPath) : false);

            updateButtonState(
                post.id,
                isUpdate ? ButtonState.DOWNLOADING : ButtonState.IN_QUEUE
            );

            let imageBlob: Blob;
            let characterInfo: ChubCharacterResponse | undefined;

            if (fullPath) {
                const info = await fetch(
                    `https://gateway.chub.ai/api/characters/${fullPath}`,
                    { referrerPolicy: "no-referrer" }
                );

                if (!info.ok) {
                    throw new Error(
                        `Failed to fetch character info for ${fullPath}`
                    );
                }

                characterInfo = await info.json();

                if (!characterInfo?.node.max_res_url) {
                    throw new Error(
                        `Return character info for ${fullPath} has no max_res_url`
                    );
                }

                const image = await fetch(characterInfo?.node.max_res_url, {
                    referrerPolicy: "no-referrer"
                });

                if (!image.ok) {
                    throw new Error(
                        `Failed to fetch character image: ${image.status} ${image.statusText}`
                    );
                }

                imageBlob = await image.blob();
            } else if (post.imageURL) {
                const image = await fetch(post.imageURL);

                if (!image.ok) {
                    throw new Error(
                        `Failed to fetch character image: ${image.status} ${image.statusText}`
                    );
                }

                imageBlob = await image.blob();
            } else {
                const link = post.links.find((link) =>
                    /\.(png|webp|jpe?g)(\?.*)?$/i.test(link.href)
                ); //TODO: handle multiple image links

                if (!link) {
                    throw new Error(
                        "No chub.ai link, image link, or images found in post."
                    );
                }

                const image = await fetch(link.href);

                if (!image.ok) {
                    throw new Error(
                        `Failed to fetch character image: ${image.status} ${image.statusText}`
                    );
                }

                imageBlob = await image.blob();
            }

            const arrayBuffer = await imageBlob.arrayBuffer();
            const json = characterInfo
                ? fetchCharacterJSON(characterInfo.node)
                : JSON.parse(readCharacterImage(arrayBuffer));

            const character = await importCharacter(json, arrayBuffer);

            const updateData: Pick<
                (typeof character)["data"],
                "source" | "extensions"
            > = {
                source: [...character.data.source, `anchorhold:${post.id}`],
                extensions: {
                    ...character.data.extensions,
                    anchorhold: {
                        ...character.data.extensions.anchorhold,
                        id: post.id
                    }
                }
            };

            if (characterInfo) {
                updateData.source.push(
                    `chub:${characterInfo.node.fullPath}`,
                    characterInfo.node.max_res_url
                );
                updateData.extensions.monogatari = {
                    ...character.data.extensions.monogatari,
                    tagline: characterInfo.node.tagline
                };
            }

            await character.update(updateData);

            toast.promise(scanGallery(character), {
                loading: `Scanning ${character.data.name} for images...`,
                success: ({ total, replaced }) => ({
                    message: "Scan completed successfully!",
                    description: `Downloaded ${total} images, and replaced ${replaced} URLs with embedded images.`
                }),
                error: (error: Error) => {
                    console.error("Scan failed:", error);
                    return error.message;
                }
            });

            return { post, isUpdate, record: character };
        },
        onMutate: (post) => {
            updateButtonState(post.id, ButtonState.DOWNLOADING);
        },
        onSuccess: ({ post, isUpdate, record }) => {
            updateButtonState(post.id, ButtonState.DONE);
            toast.success(
                `${isUpdate ? "Updated" : "Downloaded"} ${record.data.name} successfully!`,
                {
                    action: {
                        label: "Open",
                        onClick: () => {
                            void navigate({
                                to: "/characters/$id",
                                params: { id: record.id }
                            });
                        }
                    }
                }
            );
        },
        onError: (error, post) => {
            console.error("Download failed for", post.id, error);
            updateButtonState(post.id, ButtonState.ERROR, error.message);
            toast.error(`Download failed for ${post.id}`, {
                description: error.message
            });
        },
        onSettled: (_data, _error, post) => {
            setTimeout(() => {
                const next =
                    buttonStates[post.id]?.state === ButtonState.ERROR
                        ? ButtonState.READY_DOWNLOAD
                        : ButtonState.READY_UPDATE;
                updateButtonState(post.id, next);
            }, 15_000);
        }
    });

    const isMobile = useMobile();
    const listRef = useRef<HTMLDivElement>(null);
    const virtualizer = useWindowVirtualizer({
        count: posts.length,
        estimateSize: () => (isMobile ? 256 : 384),
        overscan: 4,
        scrollMargin: listRef.current?.offsetTop ?? 0,
        gap: 8
    });

    const virtualItems = virtualizer.getVirtualItems();
    useEffect(() => {
        const [lastRow] = [...virtualItems].reverse();
        const isLastRow = lastRow?.index >= posts.length - 1;

        if (isLastRow && hasNextPage && !isFetching) {
            fetchNextPage();
        }
    }, [virtualItems, posts, hasNextPage, isFetching, fetchNextPage]);

    if (isFetching && !isFetchingNextPage) {
        return (
            <div
                ref={listRef}
                className="relative w-full pt-2 pb-4 overflow-auto space-y-2"
            >
                {[...Array(8)].map((_, index) => (
                    <Skeleton
                        key={`skeleton-${index}`}
                        className="rounded-xl w-auto h-64 sm:h-96"
                    />
                ))}
            </div>
        );
    }

    if (posts.length === 0 && !isFetching) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center h-64">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No posts found.</p>
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className="relative w-full mt-2 pt-2 pb-4 overflow-auto"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualItems.map((row) => {
                const post = posts[row.index];
                if (!post) return null;
                return (
                    <div
                        key={row.key}
                        data-index={row.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full"
                        style={{
                            height: row.size,
                            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`
                        }}
                    >
                        <AnchorholdCard
                            post={post}
                            buttonState={
                                buttonStates[post.id]?.state ??
                                getDefaultButtonState(post.id)
                            }
                            handleDownload={() => downloadMutation.mutate(post)}
                        />
                    </div>
                );
            })}
        </div>
    );
}
