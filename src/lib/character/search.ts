import { db } from "@/database/monogatari-db";
import { Character } from "@/database/schema/character";
import { shuffle } from "es-toolkit";
import z from "zod";

export const characterSearchSchema = z.object({
    search: z.string().default(""),
    page: z.number().min(1).default(1),
    limit: z.number().multipleOf(12).default(24),
    sort: z.enum(["a-z", "z-a", "newest", "oldest", "recent", "stale", "random"]).default("a-z")
});
export type characterSearchSchema = z.infer<typeof characterSearchSchema>;

const MAX_CACHE_SIZE = 64;
const KeyCache = new Map<string, string[]>();
const InflightKeyCache = new Map<string, Promise<string[]>>();

function touchKeyCache(key: string, value: string[]) {
    KeyCache.delete(key);
    KeyCache.set(key, value);

    while (KeyCache.size > MAX_CACHE_SIZE) {
        const oldestKey = KeyCache.keys().next().value;
        if (!oldestKey) break;
        KeyCache.delete(oldestKey);
    }
}

let hooksInstalled = false;
function installDatabaseHooks() {
    if (hooksInstalled) return;
    hooksInstalled = true;

    const invalidate = () => {
        KeyCache.clear();
        InflightKeyCache.clear();
    };

    db.characters.hook("creating", invalidate);
    db.characters.hook("updating", invalidate);
    db.characters.hook("deleting", invalidate);
}

function getSortedCollection(sort: characterSearchSchema["sort"]) {
    switch (sort) {
        case "a-z":
            return db.characters.orderBy("data.name");
        case "z-a":
            return db.characters.orderBy("data.name").reverse();
        case "newest":
            return db.characters.orderBy("createdAt").reverse();
        case "oldest":
            return db.characters.orderBy("createdAt");
        case "recent":
            return db.characters.orderBy("updatedAt").reverse();
        case "stale":
            return db.characters.orderBy("updatedAt");
        case "random":
            return db.characters.toCollection();
        default:
            return db.characters.orderBy("data.name");
    }
}

function getSearchCollection(query: string) {
    return db.characters.where("data.name").startsWithIgnoreCase(query);
}

async function getCharacterKeys(sort: characterSearchSchema["sort"], query?: string) {
    installDatabaseHooks();

    const normalizedQuery = query?.toLowerCase().trim() ?? "";
    const key = `${sort}::${normalizedQuery}`;

    const cached = KeyCache.get(key);
    if (cached) return cached;

    const inflight = InflightKeyCache.get(key);
    if (inflight) return inflight;

    const getKeys = async () => {
        let keys: string[];
        if (normalizedQuery) {
            const collection = await getSearchCollection(normalizedQuery).toArray();
            if (sort === "random") {
                keys = shuffle(collection.map((character) => character.id));
            } else {
                collection.sort((a, b) => {
                    switch (sort) {
                        case "a-z":
                            return a.data.name.localeCompare(b.data.name);
                        case "z-a":
                            return b.data.name.localeCompare(a.data.name);
                        case "newest":
                            return b.createdAt.getTime() - a.createdAt.getTime();
                        case "oldest":
                            return a.createdAt.getTime() - b.createdAt.getTime();
                        case "recent":
                            return b.updatedAt.getTime() - a.updatedAt.getTime();
                        case "stale":
                            return a.updatedAt.getTime() - b.updatedAt.getTime();
                        default:
                            return a.data.name.localeCompare(b.data.name);
                    }
                });
                keys = collection.map((character) => character.id);
            }
        } else {
            const collection = getSortedCollection(sort);
            keys = await collection.primaryKeys();
            if (sort === "random") keys = shuffle(keys);
        }

        touchKeyCache(key, keys);
        return keys;
    };

    const promise = getKeys();
    InflightKeyCache.set(key, promise);
    return await promise.finally(() => InflightKeyCache.delete(key));
}

export async function listCharacters(
    page: number,
    limit: number,
    sort: characterSearchSchema["sort"] = "a-z",
    query?: string
) {
    const keys = await getCharacterKeys(sort, query);
    const offset = (page - 1) * limit;
    const pageKeys = keys.slice(offset, offset + limit);
    if (!pageKeys.length) return [];

    const rows = await db.characters.bulkGet(pageKeys);
    const characters = rows.filter((character): character is Character => Boolean(character));

    return characters;
}

export async function countCharacters(query?: string) {
    return query ? getSearchCollection(query.toLowerCase()).count() : db.characters.count();
}
