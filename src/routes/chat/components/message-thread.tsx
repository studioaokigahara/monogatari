import { useChatContext } from "@/contexts/chat";
import { Message } from "@/routes/chat/components/message";
import { type Message as MessageType } from "@/types/message";
import { useChat } from "@ai-sdk/react";
import { ForwardedRef } from "react";

interface Props {
    scrollRef: ForwardedRef<HTMLDivElement>;
}

export default function MessageThread({ scrollRef }: Props) {
    const { chat } = useChatContext();
    const { messages, status } = useChat<MessageType>({ chat });

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
        <div className="place-center mt-4 mb-8 flex grow flex-col sm:mx-auto sm:w-2xl @min-[1025px]:w-3xl">
            {uiMessages}
            <div ref={scrollRef} id="chatScrollAnchor" />
        </div>
    );
}
