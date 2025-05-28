import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ChatProvider } from "@/contexts/chat-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { Outlet } from "@tanstack/react-router";
import { CharacterProvider } from "./contexts/character-context";
import { ImageProvider } from "./contexts/image-context";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <ImageProvider>
                <CharacterProvider>
                    <ChatProvider>
                        <SidebarProvider>
                            <AppSidebar />
                            <main className="@container flex flex-col w-full h-screen mx-4">
                                {children}
                                <Outlet />
                                <Toaster />
                            </main>
                        </SidebarProvider>
                    </ChatProvider>
                </CharacterProvider>
            </ImageProvider>
        </SettingsProvider>
    );
}
