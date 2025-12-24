import {
    Folder,
    FolderCog,
    type LucideIcon,
    MoreHorizontal,
    Trash2
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";

export function NavFolders({
    folders
}: {
    folders: {
        name: string;
        url: string;
        icon: LucideIcon;
    }[];
}) {
    const { isMobile } = useSidebar();

    const sidebarItems = folders.map((item) => (
        <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
                <Link to={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                </Link>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                        <span className="sr-only">More</span>
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                >
                    <DropdownMenuItem>
                        <Folder className="text-muted-foreground" />
                        <span>View Folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <FolderCog className="text-muted-foreground" />
                        <span>Edit Folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Trash2 className="text-muted-foreground" />
                        <span>Delete Folder</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    ));

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Folders</SidebarGroupLabel>
            <SidebarMenu>
                {sidebarItems}
                <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70">
                        <MoreHorizontal className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}
