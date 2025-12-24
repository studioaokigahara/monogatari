import { SettingsProvider } from "@/contexts/settings-context";
import { CharacterProvider } from "@/contexts/character-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
    Outlet,
    createRootRouteWithContext,
    redirect,
    HeadContent
} from "@tanstack/react-router";
import { Context } from "@/lib/router";

function RootLayout() {
    return (
        <>
            <HeadContent />
            <SettingsProvider>
                <CharacterProvider>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className="@container flex flex-col w-full h-screen mx-4">
                            <Outlet />
                            <Toaster />
                        </main>
                    </SidebarProvider>
                </CharacterProvider>
            </SettingsProvider>
        </>
    );
}

export const Route = createRootRouteWithContext<Context>()({
    component: RootLayout,
    head: () => ({
        meta: [{ title: "Monogatari" }]
    }),
    beforeLoad: ({ location }) => {
        if (location.pathname === "/") {
            throw redirect({ to: "/chat" });
        }
        return { breadcrumb: "Home" };
    }
});
