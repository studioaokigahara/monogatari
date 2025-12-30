import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton
} from "@/components/ui/input-group";
import { TextareaAutosize as Textarea } from "@/components/ui/textarea-autosize";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { useCharacterContext } from "@/hooks/use-character-context";
import { useChatContext } from "@/hooks/use-chat-context";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { replaceMacros } from "@/lib/macros";
import { cn } from "@/lib/utils";
import { type Message } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { FileUIPart } from "ai";
import {
    ArrowDown,
    ArrowUp,
    Link,
    Paperclip,
    Plus,
    Square,
    TriangleAlert
} from "lucide-react";
import {
    ChangeEvent,
    ClipboardEvent,
    FormEvent,
    KeyboardEvent,
    MouseEvent,
    RefObject,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState
} from "react";
import useEvent from "react-use-event-hook";

interface Props {
    scrollRef: RefObject<HTMLDivElement | null>;
}

export function MessageInput({ scrollRef: scrollAnchorRef }: Props) {
    const { character, persona } = useCharacterContext();
    const { chat } = useChatContext();
    const { messages, sendMessage, status, regenerate, stop } =
        useChat<Message>({
            chat
        });

    const [input, setInput] = useState("");
    const [files, setFiles] = useState<FileList | FileUIPart[]>();

    const handleInput = useEvent((event: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
    });

    const { input: fileInput, browse } = useFileDialog({
        accept: "image/*, text/*",
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) setFiles(event.target.files);
        },
        multiple: true
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!input.trim()) return;

        if (files) {
            void sendMessage({
                text: replaceMacros(input, { character, persona }),
                files
            });
        } else {
            void sendMessage({
                text: replaceMacros(input, { character, persona })
            });
        }

        setInput("");
        setFiles(undefined);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (event.nativeEvent?.isComposing) return;
            event.currentTarget.form?.requestSubmit();
        }
    };

    const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (status === "streaming" || status === "submitted") {
            event.preventDefault();
            void stop();
        } else if (status === "error") {
            event.preventDefault();
            void regenerate();
        }
    };

    const placeholder = useMemo(() => {
        const options = ["Type something...", "What would you like to say?"];
        return options[Math.floor(Math.random() * options.length)];
    }, []);

    const pasteFiles = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = event.clipboardData.files;
        if (files.length > 0) {
            event.preventDefault();
            setFiles(files);
        }
    };

    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        let checking = false;
        const checkScrollPosition = () => {
            const { scrollHeight, scrollTop, clientHeight } =
                document.scrollingElement || document.documentElement;
            const distanceFromBottom =
                scrollHeight - (scrollTop + clientHeight);
            const atBottom = distanceFromBottom < 50;
            setAutoScroll(atBottom);
            checking = false;
        };

        const onScroll = () => {
            if (checking) return;
            checking = true;
            requestAnimationFrame(checkScrollPosition);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    useLayoutEffect(() => {
        const scrollAnchor = scrollAnchorRef.current;
        if (!scrollAnchor || !autoScroll) return;

        const options =
            status === "streaming"
                ? undefined
                : ({ behavior: "smooth" } as const);

        scrollAnchor.scrollIntoView(options);
    }, [autoScroll, status, messages]); // oxlint-disable-line

    const scrollToBottom = () => {
        scrollAnchorRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    return (
        <div className="sticky bottom-2 sm:w-2xl @min-[1025px]:w-3xl sm:mx-auto">
            <Button
                variant="outline"
                className={cn(
                    "flex mx-auto -mt-9 mb-2 dark:bg-sidebar/50 backdrop-blur rounded-full transition opacity-0",
                    !autoScroll ? "opacity-100" : "pointer-events-none"
                )}
                onClick={scrollToBottom}
            >
                Scroll to Bottom
                <ArrowDown />
            </Button>
            <form onSubmit={submit}>
                <InputGroup className="rounded-3xl border-input! ring-0! dark:bg-sidebar/50 backdrop-blur">
                    <Textarea
                        data-slot="input-group-control"
                        onKeyDown={handleKeyDown}
                        onChange={handleInput}
                        onPaste={pasteFiles}
                        value={input}
                        placeholder={placeholder}
                        className="min-h-0 py-3 dark:bg-transparent resize-none border-none shadow-none focus-visible:ring-0"
                    />
                    <InputGroupAddon align="block-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <InputGroupButton
                                    variant="outline"
                                    size="icon-sm"
                                    className="rounded-full"
                                >
                                    <Plus />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={browse}>
                                    {fileInput}
                                    <Paperclip />
                                    Attach Files...
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                    <Link />
                                    Import from URL
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild></TooltipTrigger>
                            <TooltipContent>Attach file</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <InputGroupButton
                                    variant="default"
                                    size="icon-sm"
                                    type={
                                        status === "ready" ? "submit" : "button"
                                    }
                                    className="ml-auto rounded-full"
                                    disabled={
                                        status === "ready" && !input.trim()
                                    }
                                    onClick={handleButtonClick}
                                >
                                    {status === "ready" && (
                                        <ArrowUp className="size-6" />
                                    )}
                                    {(status === "streaming" ||
                                        status === "submitted") && (
                                        <Square fill="currentColor" />
                                    )}
                                    {status === "error" && (
                                        <TriangleAlert className="size-6" />
                                    )}
                                </InputGroupButton>
                            </TooltipTrigger>
                            <TooltipContent>
                                {status === "ready" && "Submit"}
                                {(status === "streaming" ||
                                    status === "submitted") &&
                                    "Stop"}
                                {status === "error" && "Retry"}
                            </TooltipContent>
                        </Tooltip>
                    </InputGroupAddon>
                </InputGroup>
                {/* {attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                            <File size={16} />
                            <div className="text-xs text-muted-foreground">
                                {attachments.length} file(s) attached
                            </div>
                        </div>
                    )} */}

                {/* <input
            type="file"
            ref={fileInputRef}
            // onChange={handleFiles}
            className="hidden"
            multiple
          /> */}
                {/* / <div */}
                {/* // className={`${messages.length > 0 ? "flex -mt-24 mb-4 z-1" : "flex grow"} w-auto h-auto `}
        // </div>
        // > */}
            </form>
        </div>
    );
}
