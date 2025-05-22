import { Search, SquarePen } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
    SidebarGroup,
    SidebarInput,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CommandMenu } from "../command-menu";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
    return (
        <SidebarGroup className="py-0">
            <SidebarMenu>
                <SidebarMenuItem className="relative flex flex-row gap-1">
                    <form
                        className="transition-[opacity,display] transition-discrete group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden"
                        {...props}
                    >
                        <Label htmlFor="search" className="sr-only">
                            Search
                        </Label>
                        <SidebarInput
                            id="search"
                            placeholder="Search"
                            className="pl-6.5 pr-10"
                        />
                        <CommandMenu />
                        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
                        <kbd className="pointer-events-none absolute right-11 top-1.5 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 text-xs">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </form>
                    <SidebarMenuButton
                        asChild
                        tooltip="New Chat"
                        className="basis-8"
                    >
                        <SquarePen className="shrink-0" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}
