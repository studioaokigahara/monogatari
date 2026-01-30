import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCharacterContext } from "@/contexts/character";
import { useSidebarContext } from "@/contexts/sidebar";
import { db } from "@/database/monogatari-db";
import { Chat } from "@/database/schema/chat";
import { getTimeGroup, sortByTimeGroupLabel } from "@/lib/time";
import { downloadFile } from "@/lib/utils";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { liveQuery } from "dexie";
import {
    ChartNetwork,
    FileDown,
    MessageCircleDashed,
    MessageCirclePlus,
    MoreHorizontal,
    PencilLine,
    Search,
    Split,
    Trash2
} from "lucide-react";
import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const GraphLoader = lazy(() => import("@/components/graph/loader"));

interface ChatHistoryItem {
    chat: Chat;
    isActive: boolean;
}

function ChatHistoryItem({ chat, isActive }: ChatHistoryItem) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [graphOpen, setGraphOpen] = useState(false);
    const { isMobile } = useSidebarContext();
    const navigate = useNavigate();

    const titleRef = useRef<HTMLInputElement>(null);

    const renameChat = async () => {
        const title = titleRef.current?.value.trim() ?? "";

        if (title && title !== chat.title) {
            await chat.updateTitle(title);
        }

        setDialogOpen(false);
    };

    const deleteChat = async () => {
        await chat.delete();
        setAlertOpen(false);

        if (isActive) {
            void navigate({ to: "/chat" });
            toast.warning("You were navigated here to prevent bugs. Pick another chat!");
        }
    };

    const exportChat = async () => {
        const data = JSON.stringify(chat);
        const file = new File(
            [data],
            `${chat.title || chat.id} ${new Date().toLocaleDateString()}.json`,
            { type: "application/json" }
        );
        downloadFile(file);
    };

    const title = chat.title ?? format(chat.updatedAt, "MMM d, HH:mm");

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={isActive}
                render={
                    chat.fork ? (
                        <span className="flex flex-row items-center">
                            <Link to="/chat/$id" params={{ id: chat.fork }}>
                                <Split className="-mr-1 size-4 opacity-50 transition hover:opacity-100" />
                            </Link>
                            <Link to="/chat/$id" params={{ id: chat.id }} className="truncate">
                                {title}
                            </Link>
                        </span>
                    ) : (
                        <Link to="/chat/$id" params={{ id: chat.id }}>
                            <span className="truncate">{title}</span>
                        </Link>
                    )
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
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>{title}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                            <PencilLine />
                            Rename...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setGraphOpen(true)}>
                            <ChartNetwork />
                            View Graph...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportChat}>
                            <FileDown />
                            Export
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setAlertOpen(true)}>
                            <Trash2 />
                            Delete...
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                        <DialogClose render={<Button type="button" variant="outline" />}>
                            Close
                        </DialogClose>
                        <Button onClick={renameChat}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this chat. Export your data first!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={deleteChat}>
                            Delete!
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
                <DialogContent className="h-full max-h-[90dvh] w-full max-w-[90dvw]! p-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Chat Graph</DialogTitle>
                        <DialogDescription>
                            Directed acyclic graph of the current chat
                        </DialogDescription>
                    </DialogHeader>
                    <Suspense
                        fallback={
                            <>
                                <Spinner className="size-6" />
                                Loading...
                            </>
                        }
                    >
                        <GraphLoader chat={chat} />
                    </Suspense>
                </DialogContent>
            </Dialog>
        </SidebarMenuItem>
    );
}

function EmptyChatHistory({ name }: { name: string }) {
    return (
        <Empty className="gap-4 border border-dashed md:p-2">
            <EmptyHeader>
                <EmptyMedia variant="icon" className="mb-0">
                    <MessageCircleDashed />
                </EmptyMedia>
                <EmptyTitle>No Chat History</EmptyTitle>
                <EmptyDescription>
                    You haven't chatted with {name} yet. Create a new chat to get started.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

export function ChatHistory() {
    const { character, persona } = useCharacterContext();

    const [query, setQuery] = useState<string>("");
    const search = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const [chats, setChats] = useState<Chat[]>();

    useEffect(() => {
        setChats(undefined);

        const dbQuery = liveQuery(() => {
            return db.chats
                .where("characterIDs")
                .anyOf(character?.id ?? "")
                .filter((chat) => {
                    if (query === "") return true;
                    if (!chat.title) return false;
                    return chat.title.toLowerCase().includes(query.toLowerCase());
                })
                .reverse()
                .sortBy("updatedAt");
        }).subscribe((chats) => setChats(chats));

        return () => dbQuery.unsubscribe();
    }, [character?.id, query]);

    const isLoading = !!character && chats === undefined;

    const timeGroups = useMemo(() => {
        if (!character || !chats) return [];

        const groups: Record<string, typeof chats> = {};
        for (const chat of chats) {
            const group = getTimeGroup(chat.updatedAt);
            if (!groups[group]) groups[group] = [];
            groups[group].push(chat);
        }

        return Object.entries(groups)
            .sort(([a], [b]) => sortByTimeGroupLabel(a, b))
            .map(([label, chatList]) => [label, chatList] as const);
    }, [character, chats]);

    const navigate = useNavigate();
    const startNewChat = async () => {
        if (!character) return;
        const chat = new Chat(character, persona);
        await chat.save();
        void navigate({ to: "/chat/$id", params: { id: chat.id } });
    };

    const { id } = useParams({ strict: false });
    const chatHistory = timeGroups.map(([label, chatList]) => (
        <Fragment key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {chatList.map((chat) => (
                        <ChatHistoryItem key={chat.id} chat={chat} isActive={id === chat.id} />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </Fragment>
    ));

    const skeletons = Array.from({
        length: Math.max(1, Math.random() * 6)
    }).map((_, index) => (
        <Fragment key={`skeleton-${index}`}>
            <SidebarGroupLabel>
                <Skeleton className={Math.random() > 0.5 ? "h-4 w-8" : "h-4 w-16"} />
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {Array.from({ length: Math.max(1, Math.random() * 4) }).map((_, index2) => (
                        <SidebarMenuItem key={`skeleton-item-${index2}`}>
                            <SidebarMenuSkeleton />
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </Fragment>
    ));

    return (
        <>
            <SidebarGroup className="py-0">
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <ButtonGroup>
                                <ButtonGroup className="transition-[width,margin,opacity] transition-discrete duration-200 will-change-[width,margin,opacity] group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-ml-2 group-data-[collapsible=icon]:w-[0%] group-data-[collapsible=icon]:opacity-0">
                                    <InputGroup className="h-8">
                                        <InputGroupInput
                                            disabled={!chatHistory.length}
                                            placeholder="Search..."
                                            onChange={search}
                                        />
                                        <InputGroupAddon
                                            align="inline-start"
                                            className="cursor-default"
                                        >
                                            <Search />
                                        </InputGroupAddon>
                                        <InputGroupAddon
                                            align="inline-end"
                                            className="cursor-default"
                                        >
                                            <Kbd>⌘K</Kbd>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </ButtonGroup>
                                <ButtonGroup className="shrink-0">
                                    <SidebarMenuButton
                                        tooltip="New Chat"
                                        onClick={startNewChat}
                                        render={<MessageCirclePlus />}
                                    />
                                </ButtonGroup>
                            </ButtonGroup>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="overflow-y-auto group-data-[collapsible=icon]:hidden">
                {chatHistory.length ? (
                    chatHistory
                ) : isLoading ? (
                    skeletons
                ) : character ? (
                    <EmptyChatHistory name={character.data.name} />
                ) : null}
            </SidebarGroup>
        </>
    );
}
