import "@/index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { router } from "@/router";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import workerUrl from "./service-worker.ts?worker&url";

let swPath: string = workerUrl;

if ("serviceWorker" in navigator) {
    // navigator.serviceWorker
    //     .register("service-worker.ts", { type: "module" })
    //     .then(() => console.log("Service Worker registered."));
    navigator.serviceWorker.addEventListener("message", (evt) => {
        if ((evt.data as any).__swLog) {
            console.log("[from SW]", ...(evt.data as any).__swLog);
        }
    });
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="theme">
            <RouterProvider router={router} />
        </ThemeProvider>
    </StrictMode>,
);
