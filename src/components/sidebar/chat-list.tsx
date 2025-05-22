import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    // SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    // SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { useCharacterContext } from "@/contexts/character-context";
import { useChatContext } from "@/contexts/chat-context";
import { db } from "@/database/database";
import { ChatRecord } from "@/database/schema/chat";
import { getTimeGroup, sortByTimeGroupLabel } from "@/lib/time";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    ChartNetwork,
    FileDown,
    MoreHorizontal,
    PencilLine,
    Trash2,
} from "lucide-react";
import { DateTime } from "luxon";
import { ReactNode, memo, useCallback, useMemo, useState } from "react";
import { GraphLoader } from "../graph/graph-loader";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "../ui/dialog";

interface ChatListItemProps {
    chat: ChatRecord;
    isActive: boolean;
    isMobile: boolean;
    setGraphID: (id: string) => void;
}

const ChatListItem = memo(function ChatListItem({
    chat,
    isActive,
    isMobile,
    setGraphID,
}: ChatListItemProps) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={isActive}>
                <Link to="/chat/$id" params={{ id: chat.id }}>
                    <span className="truncate">
                        {chat.title ||
                            DateTime.fromJSDate(chat.updatedAt).toFormat(
                                "MMM d, HH:mm",
                            )}
                    </span>
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
                    <DropdownMenuLabel>
                        <span>
                            {chat.title ||
                                DateTime.fromJSDate(chat.updatedAt).toFormat(
                                    "MMM d, HH:mm",
                                )}
                        </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <PencilLine className="text-muted-foreground" />
                        <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setGraphID(chat.id)}>
                        <ChartNetwork className="text-muted-foreground" />
                        <span>View Graph</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <FileDown className="text-muted-foreground" />
                        <span>Export</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">
                        <Trash2 className="text-muted-foreground" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    );
});

interface ChatListGroupProps {
    label: string;
    chatList: ChatRecord[];
    activeID: string;
    isMobile: boolean;
    setGraphID: (id: string) => void;
}

const ChatListGroup = memo(function ChatListGroup({
    label,
    chatList,
    activeID,
    isMobile,
    setGraphID,
}: ChatListGroupProps) {
    return (
        <SidebarMenu>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            {chatList.map((chat) => (
                <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeID == chat.id}
                    isMobile={isMobile}
                    setGraphID={setGraphID}
                />
            ))}
        </SidebarMenu>
    );
});

export const ChatList = memo(function ChatList() {
    const { character } = useCharacterContext();
    const id = useChatContext((context) => context.id);
    const chats = useLiveQuery(
        () => db.chats.orderBy("updatedAt").reverse().toArray(),
        [],
    );
    const [graphID, setGraphID] = useState<string | null>(null);

    const timeGroups = useMemo(() => {
        if (!character || !chats) return [];

        const filteredChats = chats.filter((chat) =>
            chat.characterIDs.includes(character.id),
        );

        const groups: Record<string, typeof chats> = {};
        filteredChats.forEach((chat) => {
            const time = DateTime.fromJSDate(chat.updatedAt);
            const group = getTimeGroup(time);
            if (!groups[group]) groups[group] = [];
            groups[group].push(chat);
        });

        return Object.entries(groups)
            .sort(([a], [b]) => sortByTimeGroupLabel(a, b))
            .map(([label, chatList]) => [label, chatList] as const);
    }, [character, chats]);

    const { isMobile } = useSidebar();

    const handleSetGraphID = useCallback((id: string) => {
        setGraphID(id);
    }, []);

    return (
        <>
            <SidebarGroup className="group-data-[collapsible=icon]:hidden overflow-y-auto">
                {timeGroups.map(([label, chatList]) => (
                    <ChatListGroup
                        key={label}
                        label={label}
                        chatList={chatList}
                        activeID={id}
                        isMobile={isMobile}
                        setGraphID={handleSetGraphID}
                    />
                ))}
            </SidebarGroup>
            <Dialog
                open={!!graphID}
                onOpenChange={(open) => {
                    if (!open) setGraphID(null);
                }}
            >
                <DialogTitle className="sr-only">Chat Graph</DialogTitle>
                <DialogDescription className="sr-only">
                    Directed acyclic graph of the current chat
                </DialogDescription>
                <DialogContent className="max-w-[90dvw]! max-h-[90dvh] w-full h-full p-0">
                    {graphID && <GraphLoader id={graphID} />}
                </DialogContent>
            </Dialog>
        </>
    );
});
