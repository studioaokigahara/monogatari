import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            srcDir: "src",
            filename: "service-worker.js",
            strategies: "injectManifest",
            injectManifest: {
                swSrc: "src/service-worker.ts",
                swDest: "service-worker.js",
            },
            devOptions: {
                enabled: true,
                type: "module",
            },
            registerType: "autoUpdate",
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
            },
        }),
    ],
    optimizeDeps: {
        include: ["ai", "@ai-sdk/openai"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
