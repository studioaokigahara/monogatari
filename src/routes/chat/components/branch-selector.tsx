import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { useChatContext } from "@/contexts/chat-context";
import { cn } from "@/lib/utils";
import { type Message } from "@/types/message";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";

interface Props extends React.ComponentProps<"button"> {
    message: Message;
    editing: boolean;
    className: string;
}

export function BranchSelector({ message, editing, className }: Props) {
    const { graphSync, chat } = useChatContext();
    const { setMessages, status } = useChat<Message>({ chat });

    const [siblings, setSiblings] = useState(
        graphSync.getSiblingCount(message.id)
    );

    useEffect(() => {
        if (editing) return;

        const abortController = new AbortController();
        const updateSiblings = () => {
            if (abortController.signal.aborted) return;
            setSiblings(graphSync.getSiblingCount(message.id));
        };

        updateSiblings();
        const timeout = setTimeout(() => updateSiblings, 200);

        return () => {
            abortController.abort();
            clearTimeout(timeout);
        };
    }, [editing, graphSync, message, status]);

    const selectPreviousBranch = () => {
        setMessages((messages) => {
            const branchMessages = graphSync.selectBranch(
                messages,
                message.id,
                -1
            );
            return branchMessages ?? messages;
        });
    };

    const selectNextBranch = () => {
        setMessages((messages) => {
            const branchMessages = graphSync.selectBranch(
                messages,
                message.id,
                1
            );
            return branchMessages ?? messages;
        });
    };

    if (editing) return null;

    return (
        <ButtonGroup
            className={cn(
                "h-9 transition-[width,margin,opacity] will-change-[width,margin,opacity]",
                siblings.total <= 1 &&
                    "group-data-[role=assistant]:w-0 -ml-2 opacity-0 pointer-events-none"
            )}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        aria-label="Previous Branch"
                        size="icon"
                        variant="ghost"
                        disabled={status !== "ready"}
                        className={cn("peer", className)}
                        onClick={selectPreviousBranch}
                    >
                        <ChevronLeft />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Previous Branch</TooltipContent>
            </Tooltip>
            <ButtonGroupText
                className={cn(
                    "bg-transparent border-0 text-sm font-medium peer-disabled:opacity-50",
                    className
                )}
            >
                {siblings.current} / {siblings.total}
            </ButtonGroupText>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        aria-label="Next Branch"
                        size="icon"
                        variant="ghost"
                        disabled={status !== "ready"}
                        className={className}
                        onClick={selectNextBranch}
                    >
                        <ChevronRight />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Next Branch</TooltipContent>
            </Tooltip>
        </ButtonGroup>
    );
}
