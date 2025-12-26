import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import { useCharacterContext } from "@/contexts/character-context";
import { db } from "@/database/monogatari-db";
import { Chat } from "@/database/schema/chat";
import { getTimeGroup, sortByTimeGroupLabel } from "@/lib/time";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    ChartNetwork,
    FileDown,
    MessageCirclePlus,
    MoreHorizontal,
    PencilLine,
    Search,
    Split,
    Trash2
} from "lucide-react";
import { DateTime } from "luxon";
import {
    ChangeEvent,
    Fragment,
    lazy,
    Suspense,
    useCallback,
    useMemo,
    useRef,
    useState
} from "react";
import useEvent from "react-use-event-hook";
import { toast } from "sonner";
import { ButtonGroup } from "../ui/button-group";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "../ui/input-group";
import { Kbd } from "../ui/kbd";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";

const GraphLoader = lazy(() => import("@/components/graph/loader"));

interface ChatHistoryItem {
    chat: Chat;
    isActive: boolean;
    isMobile: boolean;
    setGraphID: (id: string) => void;
}

function ChatHistoryItem({
    chat,
    isActive,
    isMobile,
    setGraphID
}: ChatHistoryItem) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const navigate = useNavigate();

    const titleRef = useRef<HTMLInputElement>(null);

    const renameChat = useCallback(async () => {
        const title = titleRef.current?.value.trim() ?? "";

        if (title && title !== chat.title) {
            await chat.updateTitle(title);
        }

        setDialogOpen(false);
    }, [chat]);

    const deleteChat = useCallback(async () => {
        await chat.delete();
        setAlertOpen(false);

        if (isActive) {
            navigate({ to: "/chat" });
            toast.warning(
                "You were navigated here to prevent bugs. Pick another chat!"
            );
        }
    }, [chat, isActive, navigate]);

    const exportChat = async () => {
        const result = await Chat.load(chat.id);
        if (!result) {
            toast.error("Failed to load graph from DB.");
            return;
        }
        const { graph, record } = result;
        const data = JSON.stringify(graph.save());
        const file = new File(
            [data],
            `${record.title || chat.id} ${new Date().toLocaleDateString()}.json`,
            { type: "application/json" }
        );
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const chatTitle =
        chat.title ??
        DateTime.fromJSDate(chat.updatedAt).toFormat("MMM d, HH:mm");

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={isActive}>
                {chat.fork ? (
                    <span className="flex flex-row items-center">
                        <Link to="/chat/$id" params={{ id: chat.fork }}>
                            <Split className="size-4 -mr-1 opacity-50 transition hover:opacity-100" />
                        </Link>
                        <Link
                            to="/chat/$id"
                            params={{ id: chat.id }}
                            className="truncate"
                        >
                            {chatTitle}
                        </Link>
                    </span>
                ) : (
                    <Link to="/chat/$id" params={{ id: chat.id }}>
                        <span className="truncate">{chatTitle}</span>
                    </Link>
                )}
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
                                <span>{chatTitle}</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DialogTrigger asChild>
                                <DropdownMenuItem>
                                    <PencilLine className="text-muted-foreground" />
                                    <span>Rename...</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <DropdownMenuItem
                                onSelect={() => setGraphID(chat.id)}
                            >
                                <ChartNetwork className="text-muted-foreground" />
                                <span>View Graph...</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportChat}>
                                <FileDown className="text-muted-foreground" />
                                <span>Export...</span>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem variant="destructive">
                                    <Trash2 className="text-muted-foreground" />
                                    <span>Delete...</span>
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
                            <Button onClick={renameChat}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this chat. Export
                                your data first!
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({
                                    variant: "destructive"
                                })}
                                onClick={deleteChat}
                            >
                                Delete!
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Dialog>
        </SidebarMenuItem>
    );
}

export function ChatHistory() {
    const { character } = useCharacterContext();

    const [graphID, setGraphID] = useState<string>("");

    const [searchTerm, setSearchTerm] = useState<string>("");
    const search = useEvent((event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    });

    const chats = useLiveQuery(
        () =>
            db.chats
                .where("characterIDs")
                .anyOf(character?.id || "")
                .filter((chat) => {
                    if (searchTerm === "") return true;
                    if (!chat.title) return false;
                    return chat.title
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());
                })
                .reverse()
                .sortBy("updatedAt"),
        [character?.id, searchTerm]
    );

    const timeGroups = useMemo(() => {
        if (!character || !chats) return [];

        const groups: Record<string, typeof chats> = {};
        for (const chat of chats) {
            const time = DateTime.fromJSDate(chat.updatedAt);
            const group = getTimeGroup(time);
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
        const chat = new Chat(character);
        await chat.save();
        navigate({ to: "/chat/$id", params: { id: chat.id } });
    };

    const { id } = useParams({ strict: false });
    const { isMobile } = useSidebar();
    const chatHistory = timeGroups.map(([label, chatList]) => (
        <Fragment key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {chatList.map((chat) => (
                        <ChatHistoryItem
                            key={chat.id}
                            chat={chat}
                            isActive={id === chat.id}
                            isMobile={isMobile}
                            setGraphID={setGraphID}
                        />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </Fragment>
    ));

    const skeletons = Array.from({
        length: Math.max(1, Math.random() * 6)
    }).map((_, index) => (
        <Fragment key={index}>
            <SidebarGroupLabel>
                <Skeleton className="w-8 h-4" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {Array.from({ length: Math.max(1, Math.random() * 4) }).map(
                        (_, index2) => (
                            <SidebarMenuItem key={index2}>
                                <Skeleton className="h-8" />
                            </SidebarMenuItem>
                        )
                    )}
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
                                <ButtonGroup className="transition-[width,margin,opacity] transition-discrete duration-200 will-change-[width,margin,opacity] group-data-[collapsible=icon]:w-[0%] group-data-[collapsible=icon]:-ml-2 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
                                    <InputGroup className="h-8">
                                        <InputGroupInput
                                            disabled={!timeGroups.length}
                                            placeholder="Search"
                                            onChange={search}
                                        />
                                        <InputGroupAddon align="inline-start">
                                            <Search />
                                        </InputGroupAddon>
                                        <InputGroupAddon align="inline-end">
                                            <Kbd>⌘K</Kbd>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </ButtonGroup>
                                <ButtonGroup className="shrink-0">
                                    <SidebarMenuButton
                                        asChild
                                        tooltip="New Chat"
                                        onClick={startNewChat}
                                    >
                                        <MessageCirclePlus />
                                    </SidebarMenuButton>
                                </ButtonGroup>
                            </ButtonGroup>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="group-data-[collapsible=icon]:hidden overflow-y-auto">
                {timeGroups.length ? chatHistory : character ? skeletons : null}
            </SidebarGroup>
            <Dialog
                open={!!graphID}
                onOpenChange={(open) => {
                    if (!open) setGraphID("");
                }}
            >
                <DialogTitle className="sr-only">Chat Graph</DialogTitle>
                <DialogDescription className="sr-only">
                    Directed acyclic graph of the current chat
                </DialogDescription>
                <DialogContent className="max-w-[90dvw]! max-h-[90dvh] w-full h-full p-0">
                    <Suspense
                        fallback={
                            <>
                                <Spinner className="size-6" />
                                Loading...
                            </>
                        }
                    >
                        {graphID && <GraphLoader id={graphID} />}
                    </Suspense>
                </DialogContent>
            </Dialog>
        </>
    );
}
