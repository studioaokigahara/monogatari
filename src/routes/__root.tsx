import { BackupStatus } from "@/components/backup-status";
import { CharacterProvider } from "@/components/providers/character";
import { ThemeProvider } from "@/components/providers/theme";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { settingsCollection } from "@/hooks/use-settings";
import { Context } from "@/router";
import { HeadContent, Outlet, createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

function RootLayout() {
    return (
        <>
            <HeadContent />
            <TanStackRouterDevtools />
            <BackupStatus />
            <CharacterProvider>
                <ThemeProvider>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className="@container mx-4 flex h-screen w-full flex-col">
                            <Outlet />
                            <Toaster />
                        </main>
                    </SidebarProvider>
                </ThemeProvider>
            </CharacterProvider>
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
    },
    loader: async () => {
        await settingsCollection.preload();
        return null;
    }
});
