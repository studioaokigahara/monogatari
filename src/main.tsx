import { ThemeProvider } from "@/components/theme-provider";
import "@/index.css";
import { router } from "@/router";
import { RouterProvider } from "@tanstack/react-router";
// import { StrictMode } from "react";
import { queryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
    // <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </ThemeProvider>
    // </StrictMode>,
);
