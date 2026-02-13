import { handleChatCompletionRequest, handleChatRequest } from "@/lib/workers/handlers/chat";
import { handleImageRequest } from "@/lib/workers/handlers/image";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

void self.skipWaiting();
clientsClaim();

self.onfetch = (event: FetchEvent) => {
    const url = new URL(event.request.url);

    if (event.request.method === "GET" && url.pathname.startsWith("/images/")) {
        event.respondWith(handleImageRequest(event.request));
        return;
    }

    if (event.request.method === "POST") {
        switch (url.pathname) {
            case "/api/chat":
                event.respondWith(handleChatRequest(event.request));
                return;
            case "/api/chat/completions":
                event.respondWith(handleChatCompletionRequest(event.request));
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
};

self.onnotificationclick