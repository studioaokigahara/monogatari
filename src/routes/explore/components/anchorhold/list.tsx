import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/database/monogatari-db";
import { useIsMobile } from "@/hooks/use-mobile";
import { importCharacter, readCharacterImage } from "@/lib/character/io";
import { scanGallery } from "@/lib/character/scanner";
import { AnchorholdPost } from "@/lib/explore/anchorhold/api";
import { fetchCharacterJSON } from "@/lib/explore/chub/api";
import { AnchorholdItem } from "@/routes/explore/components/anchorhold/item";
import { ChubCharacterResponse } from "@/types/explore/chub";
import { useMutation } from "@tanstack/react-query";
import { useElementScrollRestoration, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
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
    const preload = useLoaderData({ from: "/explore/anchorhold" });
    const downloadedCharacters = useLiveQuery(() => db.characters.toArray(), [], preload);

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

    const { anchorholdIDs, chubFullPaths } = useMemo(() => {
        const anchorholdSet = new Set<string>();
        const chubSet = new Set<string>();

        if (downloadedCharacters === undefined) {
            return { anchorholdIDs: anchorholdSet, chubFullPaths: chubSet };
        }

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

    const navigate = useNavigate();

    const downloadMutation = useMutation({
        mutationFn: async (post: AnchorholdPost) => {
            const fullPath = chubCharacters.get(post.id);
            const isUpdate =
                anchorholdIDs.has(post.id) || (fullPath ? chubFullPaths.has(fullPath) : false);

            let imageLink: string;
            let characterInfo: ChubCharacterResponse | undefined;

            if (fullPath) {
                const info = await fetch(`https://gateway.chub.ai/api/characters/${fullPath}`, {
                    referrerPolicy: "no-referrer"
                });

                if (!info.ok) {
                    throw new Error(`Failed to fetch character info for ${fullPath}`);
                }

                characterInfo = await info.json();

                if (!characterInfo?.node.max_res_url) {
                    throw new Error(`Return character info for ${fullPath} has no max_res_url`);
                }

                imageLink = characterInfo.node.max_res_url;
            } else if (post.imageURL) {
                imageLink = post.imageURL;
            } else {
                const link = post.links.find((link) =>
                    /\.(png|webp|jpe?g)(\?.*)?$/i.test(link.href)
                ); //TODO: handle multiple image links

                if (!link) {
                    throw new Error("No chub.ai link, image link, or images found in post.");
                }

                imageLink = link.href;
            }

            const image = await fetch(imageLink, {
                referrerPolicy: "no-referrer"
            });

            if (!image.ok) {
                throw new Error(
                    `Failed to fetch character image: ${image.status} ${image.statusText}`
                );
            }

            const imageBlob = await image.blob();
            const arrayBuffer = await imageBlob.arrayBuffer();
            const json = characterInfo
                ? await fetchCharacterJSON(characterInfo.node)
                : JSON.parse(readCharacterImage(arrayBuffer));

            const character = await importCharacter(json, arrayBuffer);

            const updateData: Pick<(typeof character)["data"], "source" | "extensions"> = {
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

            return { post, record: character, isUpdate };
        },
        onSuccess: ({ record, isUpdate }) => {
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
            toast.error(`Download failed for ${post.id}`, {
                description: error.message
            });
        }
    });

    const isMobile = useIsMobile();
    const listRef = useRef<HTMLDivElement>(null);

    const scrollEntry = useElementScrollRestoration({
        getElement: () => window
    });

    const virtualizer = useWindowVirtualizer({
        count: posts.length,
        estimateSize: () => (isMobile ? 256 : 384),
        overscan: 4,
        scrollMargin: listRef.current?.offsetTop ?? 0,
        gap: 8,
        initialOffset: scrollEntry?.scrollY
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
            <div ref={listRef} className="relative w-full space-y-2 overflow-auto pt-2 pb-4">
                {[...Array(8)].map((_, index) => (
                    <Skeleton
                        key={`skeleton-${index}`}
                        className="h-64 w-auto rounded-xl sm:h-96"
                    />
                ))}
            </div>
        );
    }

    if (posts.length === 0 && !isFetching) {
        return (
            <div className="col-span-full flex h-64 flex-col items-center justify-center">
                <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">No posts found.</p>
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className="relative mt-2 w-full overflow-auto pt-2 pb-4"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualItems.map((item) => {
                const post = posts[item.index];
                if (!post) return null;
                const fullPath = chubCharacters.get(post.id);
                const isDownloaded =
                    anchorholdIDs.has(post.id) || (fullPath ? chubFullPaths.has(fullPath) : false);
                return (
                    <div
                        key={item.key}
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full"
                        style={{
                            height: item.size,
                            transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`
                        }}
                    >
                        <AnchorholdItem
                            post={post}
                            isDownloaded={isDownloaded}
                            onClick={async () => {
                                await downloadMutation.mutateAsync(post);
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
