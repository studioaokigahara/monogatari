import { useChatContext } from "@/contexts/chat-context";
import { type Message as MessageType } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Message } from "./message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

export default function MessageThread() {
    const { chat } = useChatContext();
    const { messages, status } = useChat<MessageType>({
        chat
    });

    const scrollAnchorRef = useRef<HTMLDivElement>(null);
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
    }, [messages, autoScroll, status]);

    const scrollToBottom = () => {
        scrollAnchorRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    const uiMessages = messages
        .filter((message) => message.role !== "system")
        .map((message, index, array) => {
            const lastMessage = array.at(-1);
            const streaming =
                status === "streaming" &&
                lastMessage?.role === "assistant" &&
                lastMessage.id === message.id;
            const showTypingIndicator =
                status === "streaming" &&
                lastMessage?.role === "assistant" &&
                lastMessage?.parts?.length === 0 &&
                lastMessage.id === message.id;

            return (
                <Message
                    key={message.id}
                    message={message}
                    index={index}
                    streaming={streaming}
                    showTypingIndicator={showTypingIndicator}
                />
            );
        });

    return (
        <div className="flex flex-col sm:w-2xl @min-[1025px]:w-3xl sm:mx-auto place-center mt-4 mb-8">
            {uiMessages}
            <Button
                variant="outline"
                className={cn(
                    "flex sticky mx-auto -mb-9 bottom-28 dark:bg-sidebar/50 backdrop-blur rounded-full transition opacity-0",
                    !autoScroll ? "opacity-100" : "pointer-events-none"
                )}
                onClick={scrollToBottom}
            >
                Scroll to Bottom
                <ArrowDown />
            </Button>
            <div ref={scrollAnchorRef} id="chat-scroll-anchor" />
        </div>
    );
}
