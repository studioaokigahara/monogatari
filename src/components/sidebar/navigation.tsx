"use client";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem
} from "@/components/ui/sidebar";
import { ReactNode } from "react";

interface NavigationItem {
    title: string;
    url?: string;
    icon: ReactNode;
    isActive?: boolean;
    items?: {
        title: string;
        url: string;
        icon: ReactNode;
    }[];
}

interface NavigationProps {
    items: NavigationItem[];
}

export function Navigation({ items }: NavigationProps) {
    const sidebarItems = items.map((item) =>
        item.items ? (
            <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
            >
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                            {item.icon}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton asChild>
                                        <Link to={subItem.url}>
                                            {subItem.icon}
                                            <span>{subItem.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        ) : (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                    <Link to={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    );

    return (
        <SidebarGroup>
            <SidebarMenu>{sidebarItems}</SidebarMenu>
        </SidebarGroup>
    );
}
