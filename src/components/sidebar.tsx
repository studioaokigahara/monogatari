import { Navigation } from "@/components/sidebar/navigation";
import { PersonaSwitcher } from "@/components/sidebar/persona-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarRail
} from "@/components/ui/sidebar";
import {
    BookMarked,
    Cog,
    FileText,
    // Frame,
    // Map,
    // PieChart,
    Plug,
    Shapes,
    SlidersHorizontal,
    // Sparkles,
    // Terminal,
    Users
} from "lucide-react";
import * as React from "react";
import { ChatHistory } from "./sidebar/chat-history";
import { CommandMenu } from "./command-menu";

const data = {
    navMain: [
        // {
        //     title: "Assistants",
        //     url: "#",
        //     icon: Sparkles,
        // },
        {
            title: "Characters",
            url: "/characters",
            icon: <Users />,
            isActive: true
        },
        {
            title: "Explore",
            url: "/explore",
            icon: <Shapes />
        },
        {
            title: "Settings",
            icon: <Cog />,
            items: [
                {
                    title: "General",
                    url: "/settings",
                    icon: <SlidersHorizontal />
                },
                {
                    title: "API",
                    url: "/settings/api",
                    icon: <Plug />
                },
                {
                    title: "Presets",
                    url: "/settings/presets",
                    icon: <FileText />
                },
                {
                    title: "Lorebooks",
                    url: "/settings/lorebooks",
                    icon: <BookMarked />
                }
                // {
                //     title: "Formatting",
                //     url: "/settings/formatting",
                //     icon: RemoveFormatting
                // },
                // {
                //     title: "Tools",
                //     url: "/settings/tools",
                //     icon: Wrench
                // }
            ]
        }
    ]
    // folders: [
    //     {
    //         name: "Design Engineering",
    //         url: "#",
    //         icon: Frame
    //     },
    //     {
    //         name: "Sales & Marketing",
    //         url: "#",
    //         icon: PieChart
    //     },
    //     {
    //         name: "Travel",
    //         url: "#",
    //         icon: Map
    //     }
    // ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar variant="floating" collapsible="icon" {...props}>
            <CommandMenu />
            <SidebarContent>
                <Navigation items={data.navMain} />
                {/* <NavFolders folders={data.folders} /> */}
                <ChatHistory />
            </SidebarContent>
            <SidebarFooter>
                <PersonaSwitcher />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
