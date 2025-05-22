import { AutoResizeTextarea } from "@/components/autoresize-textarea";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatContext } from "@/contexts/chat-context";
import {
    ArrowUp,
    File,
    PaperclipIcon,
    Square,
    TriangleAlert,
} from "lucide-react";
import React, {
    ChangeEvent,
    KeyboardEvent,
    useRef,
    memo,
    useState,
} from "react";
import TextareaAutosize from "react-textarea-autosize";

export function SendForm() {
    // const messages = useChatContext((context) => context.messages);
    const status = useChatContext((context) => context.status);
    const input = useChatContext((context) => context.input);
    const handleInputChange = useChatContext(
        (context) => context.handleInputChange,
    );
    const handleSubmit = useChatContext((context) => context.handleSubmit);
    const attachments = useChatContext((context) => context.attachments);
    const setAttachments = useChatContext((context) => context.setAttachments);
    const reload = useChatContext((context) => context.reload);
    const stop = useChatContext((context) => context.stop);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setAttachments(e.target.files);
    };

    return (
        <div
        // className={`${messages.length > 0 ? "flex -mt-24 mb-4 z-1" : "flex grow"} w-auto h-auto `}
        >
            <TooltipProvider>
                <form
                    onSubmit={handleSubmit}
                    className={`flex flex-col w-full rounded-3xl p-4 border-input bg-sidebar/50 backdrop-blur`}
                >
                    {attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                            <File size={16} />
                            <div className="text-xs text-muted-foreground">
                                {attachments.length} file(s) attached
                            </div>
                        </div>
                    )}
                    <TextareaAutosize
                        onKeyDown={handleKeyDown}
                        onChange={handleInputChange}
                        value={input}
                        placeholder="Type something"
                        className="w-full mb-4 resize-none focus:outline-none placeholder:text-muted-foreground"
                    />

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFiles}
                        className="hidden"
                        multiple
                    />

                    <div className="flex items-center justify-between">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <PaperclipIcon />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Attach file</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type={
                                        status === "ready" ? "submit" : "button"
                                    }
                                    size="icon"
                                    className="rounded-full"
                                    disabled={
                                        status === "ready" && !input.trim() //&&
                                        // attachments.length === 0
                                    }
                                    onClick={(
                                        e: React.MouseEvent<HTMLButtonElement>,
                                    ) => {
                                        if (
                                            status === "streaming" ||
                                            status === "submitted"
                                        ) {
                                            e.preventDefault();
                                            stop();
                                        } else if (status === "error") {
                                            e.preventDefault();
                                            reload();
                                        }
                                    }}
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
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {status === "error" ? "Retry" : "Submit"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </form>
            </TooltipProvider>
        </div>
    );
}
