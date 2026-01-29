"use client";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem
} from "@/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";

interface NavigationItem {
    title: string;
    url?: string;
    icon: React.ReactNode;
    items?: {
        title: string;
        url: string;
        icon: React.ReactNode;
    }[];
}

interface NavigationProps {
    items: NavigationItem[];
}

export function Navigation({ items }: NavigationProps) {
    const pathname = useLocation({
        select: (location) => location.pathname
    });

    const sidebarItems = items.map((item) =>
        item.items ? (
            <Collapsible
                key={item.title}
                defaultOpen={item.url?.startsWith(pathname)}
                className="group/collapsible"
                render={
                    <SidebarMenuItem>
                        <CollapsibleTrigger
                            render={
                                item.url ? (
                                    <SidebarMenuButton tooltip={item.title}>
                                        <Link
                                            to={item.url}
                                            className="flex items-center gap-2 [&>svg]:size-4"
                                        >
                                            {item.icon}
                                            <span>{item.title}</span>
                                        </Link>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                )
                            }
                        />
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.items?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                            render={
                                                <Link to={subItem.url}>
                                                    {subItem.icon}
                                                    <span>{subItem.title}</span>
                                                </Link>
                                            }
                                        />
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                }
            />
        ) : (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                    tooltip={item.title}
                    render={
                        <Link to={item.url}>
                            {item.icon}
                            <span>{item.title}</span>
                        </Link>
                    }
                />
            </SidebarMenuItem>
        )
    );

    return (
        <SidebarGroup>
            <SidebarMenu>{sidebarItems}</SidebarMenu>
        </SidebarGroup>
    );
}
