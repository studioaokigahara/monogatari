import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/characters")({
    head: () => ({
        meta: [{ title: "Characters — Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Characters"
    })
});
