import { handleChatCompletion, handleChatStream } from "@/lib/workers/handlers/chat";
import { handleImage } from "@/lib/workers/handlers/image";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

void self.skipWaiting();
clientsClaim();

self.addEventListener("fetch", (event: FetchEvent) => {
    const url = new URL(event.request.url);

    if (event.request.method === "GET" && url.pathname.startsWith("/images/")) {
        event.respondWith(handleImage(event.request));
        return;
    }

    if (event.request.method === "POST") {
        switch (url.pathname) {
            case "/api/chat":
                event.respondWith(handleChatStream(event.request));
                return;
            case "/api/chat/completions":
                event.respondWith(handleChatCompletion(event.request));
                return;
            // case "/api/generate/image":
            //     return image(event.request);
            // case "/api/generate/embed":
            //     return generateEmbed(event.request);
            default:
                return new Response("Endpoint not found", {
                    status: 404
                });
        }
    }
});
