import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/explore")({
    component: () => <Outlet />,
    head: () => ({
        meta: [{ title: "Explore - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Explore"
    })
});
