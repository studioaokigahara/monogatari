import z from "zod";

export const RisuSearchInfo = z.object({
    cards: z.number(),
    page: z.number(),
    sort: z.number(),
    nsfwOption: z.number(),
    nsfw: z.number(),
    mode: z.number(),
    search: z.number()
});
export type RisuSearchInfo = z.infer<typeof RisuSearchInfo>;

export const RisuSchemaMap = z.object({
    name: z.number(),
    desc: z.number(),
    download: z.number(),
    id: z.number(),
    img: z.number(),
    tags: z.number(),
    viewScreen: z.number(),
    haslore: z.number(),
    hasEmotion: z.number(),
    hasAsset: z.number(),
    authorname: z.number(),
    creator: z.number(),
    license: z.number(),
    hidden: z.number(),
    commentopen: z.number(),
    date: z.number(),
    type: z.number(),
    original: z.number()
});
export type RisuSchemaMap = z.infer<typeof RisuSchemaMap>;

const RisuPrimitive = z
    .union([z.string(), z.array(z.number()), z.boolean(), z.number()])
    .nullable();
type RisuPrimitive = z.infer<typeof RisuPrimitive>;

export const RisuNode = z
    .object({
        type: z.enum(["data", "skip"]),
        data: z.array(z.union([RisuSearchInfo, RisuSchemaMap, RisuPrimitive]))
    })
    .nullable();
export type RisuNode = z.infer<typeof RisuNode>;

export const RisuResponse = z.object({
    type: z.literal("data"),
    nodes: z.array(RisuNode)
});
export type RisuResponse = z.infer<typeof RisuResponse>;

export const RisuResult = z.object({
    name: z.string(),
    desc: z.string(),
    download: z.string(),
    id: z.string(),
    img: z.string(),
    tags: z.array(z.string()),
    viewScreen: z.string(),
    haslore: z.boolean(),
    hasEmotion: z.boolean(),
    hasAsset: z.boolean(),
    authorname: z.string(),
    creator: z.string(),
    license: z.string(),
    hidden: z.coerce.boolean(),
    commentopen: z.coerce.boolean(),
    date: z.string(),
    type: z.string(),
    original: z.string()
});
export type RisuResult = z.infer<typeof RisuResult>;

export const RisuRealmParser = RisuResponse.transform((response) => {
    const data =
        response.nodes.find(
            (x): x is RisuNode =>
                !!x && typeof x === "object" && Array.isArray((x as any).data)
        ) ?? [];
    if (!Array.isArray(data) || data.length === 0) return [];

    const results: RisuResult[] = [];

    for (let i = 0; i < data.length; i++) {
        const node = data[i];
        if (
            !RisuSchemaMap.keyof().options.every((key) =>
                (node as any).hasOwnProperty(key)
            )
        )
            continue;

        const schema = node as RisuSchemaMap;

        const name = data[schema.name];
        const desc = data[schema.desc];
        const download = data[schema.download];
        const id = data[schema.id];
        const img = data[schema.img];
        const tags =
            Array.isArray(data[schema.tags]) &&
            (data[schema.tags] as number[]).length > 0
                ? (data[schema.tags] as number[]).map((index) => data[index])
                : [];
        const viewScreen = data[schema.viewScreen];
        const haslore = data[schema.haslore];
        const hasEmotion = data[schema.hasEmotion];
        const hasAsset = data[schema.hasAsset];
        const authorname = data[schema.authorname];
        const creator = data[schema.creator];
        const license = data[schema.license];
        const hidden = data[schema.hidden];
        const commentopen = data[schema.commentopen];
        const date = data[schema.date];
        const type = data[schema.type];
        const original = data[schema.original];

        results.push(
            RisuResult.parse({
                id,
                name,
                desc,
                download,
                img,
                tags,
                viewScreen,
                authorname,
                creator,
                license,
                haslore,
                hasEmotion,
                hasAsset,
                hidden,
                commentopen,
                date,
                type,
                original
            })
        );
    }

    return results;
});
export type RisuRealmParser = z.infer<typeof RisuRealmParser>;
