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
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea
} from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCharacterContext } from "@/contexts/character";
import { useChatContext } from "@/contexts/chat";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { replaceMacros } from "@/lib/macros";
import { cn } from "@/lib/utils";
import { type Message } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { FileUIPart } from "ai";
import {
    ArrowDown,
    ArrowUp,
    FileIcon,
    Files,
    LinkIcon,
    Paperclip,
    Plus,
    Square,
    TriangleAlert
} from "lucide-react";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";

const MAX_HEIGHT = 48;

interface Props {
    scrollRef: RefObject<HTMLDivElement | null>;
}

export function MessageInput({ scrollRef: scrollAnchorRef }: Props) {
    const { character, persona } = useCharacterContext();
    const { chat } = useChatContext();
    const { messages, sendMessage, status, regenerate, stop } = useChat<Message>({ chat });

    const [input, setInput] = useState("");
    const [files, setFiles] = useState<FileList | FileUIPart[]>();

    const { input: fileInput, browse } = useFileDialog({
        accept: "image/*, text/*",
        multiple: true,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) setFiles(event.target.files);
        }
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (event.nativeEvent?.isComposing) return;
            event.currentTarget.form?.requestSubmit();
        }
    };

    const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
            const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
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

    useEffect(() => {
        const scrollAnchor = scrollAnchorRef.current;
        if (!scrollAnchor || !autoScroll) return;

        const options = status === "streaming" ? undefined : ({ behavior: "smooth" } as const);

        scrollAnchor.scrollIntoView(options);
    }, [scrollAnchorRef, autoScroll, status, messages]);

    const scrollToBottom = () => {
        scrollAnchorRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const [lineWrapped, setLineWrapped] = useState(false);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = event.target.value;
        setInput(input);
        if (input.includes("\n")) setLineWrapped(true);
    };

    useEffect(() => {
        const textArea = textAreaRef.current;
        if (!textArea) return;

        const checkHeight = () => {
            const wrapped = textArea.clientHeight > MAX_HEIGHT;
            setLineWrapped((prev) => (prev === wrapped ? prev : wrapped));
        };

        checkHeight();

        const observer = new ResizeObserver(checkHeight);
        observer.observe(textArea);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="sticky bottom-2 flex flex-col gap-2 sm:mx-auto sm:w-2xl @min-[1025px]:w-3xl">
            <Button
                variant="outline"
                className={cn(
                    "mx-auto -mt-8 rounded-full opacity-0 backdrop-blur transition dark:bg-sidebar/50",
                    !autoScroll ? "opacity-100" : "pointer-events-none"
                )}
                onClick={scrollToBottom}
            >
                Scroll to Bottom
                <ArrowDown />
            </Button>
            <form onSubmit={handleSubmit}>
                <InputGroup className="rounded-3xl border-border ring-0! backdrop-blur transition-[height] focus-within:border-border! has-disabled:opacity-100 dark:bg-sidebar/50 dark:has-disabled:bg-sidebar/50">
                    <InputGroupTextarea
                        name="message-input"
                        onKeyDown={handleKeyDown}
                        onChange={handleChange}
                        onPaste={handlePaste}
                        value={input}
                        placeholder={placeholder}
                        className={cn(
                            "min-h-0 transition-[position,margin,padding] transition-discrete",
                            !lineWrapped
                                ? "absolute mt-1.5 px-12 delay-[20ms,0ms,0ms]"
                                : "delay-[0ms,20ms,20ms]"
                        )}
                    />
                    <InputGroupText
                        aria-hidden
                        ref={textAreaRef}
                        className="pointer-events-none absolute mt-0.5 w-full px-13 py-3 text-base opacity-0 md:text-sm"
                    >
                        {input}
                    </InputGroupText>
                    <InputGroupAddon
                        align="block-end"
                        className={cn(!lineWrapped && "p-2", "transition-[margin,padding]")}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <InputGroupButton
                                        variant="outline"
                                        size="icon-sm"
                                        className="z-1 rounded-full"
                                    />
                                }
                            >
                                <Plus />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={browse}>
                                    {fileInput}
                                    <Paperclip />
                                    Attach Files...
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                    <LinkIcon />
                                    Import from URL
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger
                                onClick={handleButtonClick}
                                render={
                                    <InputGroupButton
                                        variant="default"
                                        size="icon-sm"
                                        type={status === "ready" ? "submit" : "button"}
                                        className="z-1 ml-auto rounded-full"
                                        disabled={status === "ready" && !input.trim()}
                                    />
                                }
                            >
                                {status === "ready" && <ArrowUp className="size-6" />}
                                {(status === "streaming" || status === "submitted") && (
                                    <Square fill="currentColor" />
                                )}
                                {status === "error" && <TriangleAlert className="size-6" />}
                            </TooltipTrigger>
                            <TooltipContent>
                                {status === "ready" && "Submit"}
                                {(status === "streaming" || status === "submitted") && "Stop"}
                                {status === "error" && "Retry"}
                            </TooltipContent>
                        </Tooltip>
                    </InputGroupAddon>
                    {files?.length && (
                        <InputGroupAddon align="block-start">
                            <InputGroupText>
                                {files.length > 1 ? <Files /> : <FileIcon />}
                                {files.length} {files.length > 1 ? "files" : "file"} attached
                            </InputGroupText>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </form>
        </div>
    );
}
