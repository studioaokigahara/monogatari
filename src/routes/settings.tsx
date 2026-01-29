import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
    component: () => <Outlet />,
    head: () => ({
        meta: [{ title: "Settings - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Settings"
    })
});
