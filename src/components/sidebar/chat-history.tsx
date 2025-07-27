import { GraphLoader } from "@/components/graph/graph-loader";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import { useCharacterContext } from "@/contexts/character-context";
import { useChatContext } from "@/contexts/chat-context";
import { db } from "@/database/database";
import { ChatRecord } from "@/database/schema/chat";
import { getTimeGroup, sortByTimeGroupLabel } from "@/lib/time";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    ChartNetwork,
    FileDown,
    MoreHorizontal,
    PencilLine,
    Trash2
} from "lucide-react";
import { DateTime } from "luxon";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "../ui/alert-dialog";
import { ChatManager } from "@/database/chats";
import { toast } from "sonner";

interface ChatHistoryItem {
    chat: ChatRecord;
    isActive: boolean;
    isMobile: boolean;
    setGraphID: (id: string) => void;
}

const ChatHistoryItem = memo(
    ({ chat, isActive, isMobile, setGraphID }: ChatHistoryItem) => {
        const [dialogOpen, setDialogOpen] = useState(false);
        const [alertOpen, setAlertOpen] = useState(false);
        const navigate = useNavigate();

        const titleRef = useRef<HTMLInputElement>(null);

        const handleRename = useCallback(async () => {
            const title = titleRef.current?.value.trim() ?? "";

            if (title && title !== chat.title) {
                await ChatManager.updateGraph(chat.id, title);
            }

            setDialogOpen(false);
        }, [chat.id, chat.title]);

        const handleDelete = useCallback(async () => {
            await ChatManager.deleteChat(chat.id);
            setAlertOpen(false);

            if (isActive) {
                navigate({ to: "/chat" });
                toast.warning(
                    "You were navigated here to prevent bugs. Pick another chat!"
                );
            }
        }, [chat.id, isActive, navigate]);

        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive}>
                    <Link to="/chat/$id" params={{ id: chat.id }}>
                        <span className="truncate">
                            {chat.title ||
                                DateTime.fromJSDate(chat.updatedAt).toFormat(
                                    "MMM d, HH:mm"
                                )}
                        </span>
                    </Link>
                </SidebarMenuButton>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
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
                                            DateTime.fromJSDate(
                                                chat.updatedAt
                                            ).toFormat("MMM d, HH:mm")}
                                    </span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DialogTrigger asChild>
                                    <DropdownMenuItem>
                                        <PencilLine className="text-muted-foreground" />
                                        <span>Rename</span>
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <DropdownMenuItem
                                    onSelect={() => setGraphID(chat.id)}
                                >
                                    <ChartNetwork className="text-muted-foreground" />
                                    <span>View Graph</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <FileDown className="text-muted-foreground" />
                                    <span>Export</span>
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem variant="destructive">
                                        <Trash2 className="text-muted-foreground" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Rename Chat</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-3">
                                <Label htmlFor="title-input">Title</Label>
                                <Input
                                    id="title-input"
                                    name="title"
                                    defaultValue={chat.title}
                                    ref={titleRef}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Close
                                    </Button>
                                </DialogClose>
                                <Button onClick={handleRename}>
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this chat.
                                    Export your data first!
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel asChild>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </AlertDialogCancel>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                >
                                    Delete!
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </Dialog>
            </SidebarMenuItem>
        );
    },
    (prev, next) => {
        return (
            prev.chat.id === next.chat.id &&
            prev.chat.title === next.chat.title &&
            prev.chat.updatedAt.getTime() === next.chat.updatedAt.getTime() &&
            prev.isActive === next.isActive &&
            prev.isMobile === next.isMobile
        );
    }
);

interface ChatHistoryGroup {
    label: string;
    chatList: ChatRecord[];
    activeID: string;
    isMobile: boolean;
    setGraphID: (id: string) => void;
}

const ChatHistoryGroup = memo(
    ({ label, chatList, activeID, isMobile, setGraphID }: ChatHistoryGroup) => {
        return (
            <SidebarMenu>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                {chatList.map((chat) => (
                    <ChatHistoryItem
                        key={chat.id}
                        chat={chat}
                        isActive={activeID === chat.id}
                        isMobile={isMobile}
                        setGraphID={setGraphID}
                    />
                ))}
            </SidebarMenu>
        );
    }
);

export const ChatHistory = memo(() => {
    const { character } = useCharacterContext();
    const { isMobile } = useSidebar();
    const id = useChatContext((context) => context.id);
    const [graphID, setGraphID] = useState<string | null>(null);
    const chats = useLiveQuery(
        () =>
            db.chats
                .where("characterIDs")
                .anyOf(character!.id)
                .reverse()
                .sortBy("updatedAt"),
        [character?.id]
    );

    const signature = useMemo(() => {
        if (!chats) return [];
        return chats.map((c) => `${c.id}::${c.title ?? ""}`);
    }, [chats]);

    const timeGroups = useMemo(() => {
        if (!character || !chats) return [];

        const groups: Record<string, typeof chats> = {};
        chats.forEach((chat) => {
            const time = DateTime.fromJSDate(chat.updatedAt);
            const group = getTimeGroup(time);
            if (!groups[group]) groups[group] = [];
            groups[group].push(chat);
        });

        return Object.entries(groups)
            .sort(([a], [b]) => sortByTimeGroupLabel(a, b))
            .map(([label, chatList]) => [label, chatList] as const);
    }, [character?.id, signature.join("|")]);

    const handleSetGraphID = useCallback((id: string) => {
        setGraphID(id);
    }, []);

    return (
        <>
            <SidebarGroup className="group-data-[collapsible=icon]:hidden overflow-y-auto">
                {timeGroups.map(([label, chatList]) => (
                    <ChatHistoryGroup
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
