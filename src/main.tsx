import "@/index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { router } from "@/router";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="theme">
            <RouterProvider router={router} />
        </ThemeProvider>
    </StrictMode>,
);
