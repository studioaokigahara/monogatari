import { Folder, FolderCog, type LucideIcon, MoreHorizontal, Trash2 } from "lucide-react";

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
    SidebarMenuItem
} from "@/components/ui/sidebar";
import { useSidebarContext } from "@/contexts/sidebar";
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
    const { isMobile } = useSidebarContext();

    const sidebarItems = folders.map((item) => (
        <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
                render={
                    <Link to={item.url}>
                        <item.icon />
                        <span>{item.name}</span>
                    </Link>
                }
            />
            <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
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
