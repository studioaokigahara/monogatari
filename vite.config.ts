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
            generatedRouteTree: "./src/lib/router/route-tree.gen.ts",
            routeFileIgnorePattern: "components|anchorhold|charchive|chub"
        }),
        react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
        reactScan(),
        tailwindcss(),
        wasm(),
        topLevelAwait(),
        VitePWA({
            registerType: "autoUpdate",
            strategies: "injectManifest",
            manifest: false,
            injectManifest: {
                injectionPoint: undefined
            },
            srcDir: "src/",
            filename: "service.worker.ts",
            devOptions: {
                enabled: true,
                type: "module"
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
