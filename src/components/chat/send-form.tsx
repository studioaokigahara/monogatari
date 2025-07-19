import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/contexts/chat-context";
import {
    ArrowUp,
    File,
    PaperclipIcon,
    Square,
    TriangleAlert
} from "lucide-react";
import React, {
    ChangeEvent,
    KeyboardEvent,
    useRef,
    memo,
    useState,
    useCallback
} from "react";
import { UseChatHelpers } from "@ai-sdk/react";

interface ToolbarProps {
    disabled: boolean;
    status: UseChatHelpers["status"];
    handleAttachments: () => void;
    handleButtonClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SendFormToolbar = memo(function Toolbar({
    disabled,
    status,
    handleAttachments,
    handleButtonClick
}: ToolbarProps) {
    return (
        <TooltipProvider>
            <div className="flex items-center justify-between">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full"
                            onClick={handleAttachments}
                        >
                            <PaperclipIcon />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type={status === "ready" ? "submit" : "button"}
                            size="icon"
                            className="rounded-full"
                            disabled={disabled}
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
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {status === "error" ? "Retry" : "Submit"}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
});

export const SendForm = memo(function SendForm() {
    // const messages = useChatContext((context) => context.messages);
    const status = useChatContext((context) => context.status);
    const input = useChatContext((context) => context.input);
    const handleInputChange = useChatContext(
        (context) => context.handleInputChange
    );
    const handleSubmit = useChatContext((context) => context.handleSubmit);
    // const attachments = useChatContext((context) => context.attachments);
    // const setAttachments = useChatContext((context) => context.setAttachments);
    const reload = useChatContext((context) => context.reload);
    const stop = useChatContext((context) => context.stop);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    // const handleFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    //     if (e.target.files) setAttachments(e.target.files);
    // }, [setAttachments]);

    const handleAttachments = useCallback(
        () => fileInputRef.current?.click(),
        []
    );

    const handleButtonClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            if (status === "streaming" || status === "submitted") {
                e.preventDefault();
                stop();
            } else if (status === "error") {
                e.preventDefault();
                reload();
            }
        },
        [status, stop, reload]
    );

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col w-full rounded-3xl p-4 space-y-2 border-input bg-sidebar/50 backdrop-blur"
        >
            {/* {attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                            <File size={16} />
                            <div className="text-xs text-muted-foreground">
                                {attachments.length} file(s) attached
                            </div>
                        </div>
                    )} */}
            <Textarea
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                value={input}
                placeholder="Type something"
                className="min-h-0 px-0 bg-transparent! border-none shadow-[none]! resize-none"
            />
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
            <SendFormToolbar
                disabled={status === "ready" && !input.trim()}
                status={status}
                handleAttachments={handleAttachments}
                handleButtonClick={handleButtonClick}
            />
        </form>
    );
});

SendForm.displayName = "SendForm";
