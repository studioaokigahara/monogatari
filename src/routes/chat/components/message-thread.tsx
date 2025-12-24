import { useChatContext } from "@/contexts/chat-context";
import { type Message as MessageType } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { Message } from "./message";
import { ForwardedRef } from "react";

interface Props {
    scrollRef: ForwardedRef<HTMLDivElement>;
}

export default function MessageThread({ scrollRef }: Props) {
    const { chat } = useChatContext();
    const { messages, status } = useChat<MessageType>({
        chat
    });

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
            <div ref={scrollRef} id="chat-scroll-anchor" />
        </div>
    );
}
