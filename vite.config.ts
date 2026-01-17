import reactScan from "@react-scan/vite-plugin-react-scan";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

export default defineConfig({
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
            generatedRouteTree: "./src/route-tree.gen.ts",
            routeFileIgnorePattern: "components|charchive"
        }),
        react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
        reactScan(),
        tailwindcss(),
        wasm(),
        topLevelAwait(),
        VitePWA({
            registerType: "autoUpdate",
            strategies: "injectManifest",
            injectManifest: {
                injectionPoint: undefined
            },
            srcDir: "src/lib/workers",
            filename: "service.worker.ts",
            devOptions: {
                enabled: true,
                type: "module"
            },
            includeAssets: ["favicon.png", "favicon.ico", "apple-touch-icon-180x180.png"],
            manifest: {
                name: "Monogatari",
                short_name: "Monogatari",
                description: "AI Chat Frontend",
                theme_color: "#0a0a0a",
                icons: [
                    {
                        src: "pwa-64x64.png",
                        sizes: "64x64",
                        type: "image/png"
                    },
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "maskable-icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    preview: {
        port: 5173
    }
});
