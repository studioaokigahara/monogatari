import { NavFolders } from "@/components/sidebar/nav-folders";
import { NavMain } from "@/components/sidebar/nav-main";
import { PersonaSwitcher } from "@/components/sidebar/persona-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarRail
} from "@/components/ui/sidebar";
import {
    BookOpenText,
    Cog,
    Frame,
    Map,
    PieChart,
    Plug,
    RemoveFormatting,
    Shapes,
    SlidersHorizontal,
    // Sparkles,
    Terminal,
    Users,
    Wrench
} from "lucide-react";
import * as React from "react";
import { ChatHistory } from "./sidebar/chat-history";
import { SearchForm } from "./sidebar/search";

// This is sample data.
const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg"
    },
    personas: [
        {
            name: "Acme Inc",
            avatar: "/avatars/shadcn.jpg"
        },
        {
            name: "Acme Corp.",
            avatar: "/avatars/shadcn.jpg"
        },
        {
            name: "Evil Corp.",
            avatar: "/avatars/shadcn.jpg"
        }
    ],
    navMain: [
        // {
        //     title: "Assistants",
        //     url: "#",
        //     icon: Sparkles,
        // },
        {
            title: "Characters",
            url: "/characters",
            icon: Users,
            isActive: true
        },
        {
            title: "Explore",
            url: "/explore",
            icon: Shapes
        },
        {
            title: "Settings",
            icon: SlidersHorizontal,
            items: [
                {
                    title: "General",
                    url: "/settings",
                    icon: Cog
                },
                {
                    title: "API",
                    url: "/settings/api",
                    icon: Plug
                },
                {
                    title: "Prompts",
                    url: "/settings/prompts",
                    icon: Terminal
                },
                {
                    title: "Tools",
                    url: "/settings/tools",
                    icon: Wrench
                },
                {
                    title: "Lorebooks",
                    url: "/settings/lorebooks",
                    icon: BookOpenText
                },
                {
                    title: "Formatting",
                    url: "/settings/formatting",
                    icon: RemoveFormatting
                }
            ]
        }
    ],
    folders: [
        {
            name: "Design Engineering",
            url: "#",
            icon: Frame
        },
        {
            name: "Sales & Marketing",
            url: "#",
            icon: PieChart
        },
        {
            name: "Travel",
            url: "#",
            icon: Map
        }
    ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <SearchForm />
                {/* <NavFolders folders={data.folders} /> */}
                <ChatHistory />
            </SidebarContent>
            <SidebarFooter>
                <PersonaSwitcher personas={data.personas} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
