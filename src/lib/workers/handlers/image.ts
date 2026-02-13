import { db } from "@/database/monogatari-db";

const MAX_AGE = 60 * 10;
const CACHE_CONTROL = `public, max-age=${MAX_AGE}, stale-while-revalidate=31536000`;

export async function handleImageRequest(request: Request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    if (parts.length < 4) return new Response("Bad Request", { status: 400 });

    const namespace = parts[2];
    const id = decodeURIComponent(parts[3]);
    const rest = parts.slice(4);

    let file: File | undefined;

    switch (namespace) {
        case "characters": {
            const filename = decodeURIComponent(rest.join("/"));
            if (!id || !filename) {
                return new Response("Bad Request: Missing ID or file name", {
                    status: 400
                });
            }

            const asset = await db.assets.get({
                "[parentID+file.name]": [id, filename]
            });

            file = asset?.file;
            break;
        }
        case "personas": {
            if (!id) {
                return new Response("Bad Request: Missing ID", { status: 400 });
            }

            const asset = await db.assets.get({
                "[category+parentID]": ["persona", id.split(".")[0]]
            });

            file = asset?.file;
            break;
        }
        default:
            return new Response("Bad Request: Invalid Namespace", { status: 400 });
    }

    if (!file) return new Response("Asset not found", { status: 404 });

    const etag = `W/"${file.lastModified}${file.size}"`;
    const noneMatch = request.headers.get("If-None-Match");

    if (noneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: new Headers({
                ETag: etag,
                "Cache-Control": CACHE_CONTROL
            })
        });
    }

    const cache = await caches.open("images");
    const cachedResponse = await cache.match(request, { ignoreVary: true });

    if (cachedResponse?.headers.get("ETag") === etag) {
        return cachedResponse;
    }

    const isAscii = /^[\x20-\x7E]*$/.test(file.name);
    const contentDisposition = isAscii
        ? `inline; filename="${file.name}"`
        : `inline; filename="${file.name.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.name)}`;

    const response = new Response(file, {
        status: 200,
        headers: {
            "Cache-Control": CACHE_CONTROL,
            "Content-Disposition": contentDisposition,
            "Content-Length": String(file.size),
            "Content-Type": file.type || "application/octet-stream",
            ETag: etag,
            "Last-Modified": new Date(file.lastModified).toUTCString()
        }
    });

    void cache.put(request, response.clone());

    return response;
}
