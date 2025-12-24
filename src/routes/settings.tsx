import Header from "@/components/header";
import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

function SettingsLayout() {
    return (
        <>
            <Header />
            <Outlet />
        </>
    );
}

export const Route = createFileRoute("/settings")({
    component: SettingsLayout,
    head: () => ({
        meta: [{ title: "Settings - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Settings"
    })
});
