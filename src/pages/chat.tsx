import ChatMessages from "@/components/chat/messages";
import { SendForm } from "@/components/chat/send-form";
import SplashScreen from "@/components/chat/splash-screen";
import Header from "@/components/header";
import { useCharacterContext } from "@/contexts/character-context";

import { useChatContext } from "@/contexts/chat-context";
import { useImageURL } from "@/hooks/use-image-url";
import { Link, useLocation } from "@tanstack/react-router";

export default function Chat() {
    const location = useLocation();
    const { character } = useCharacterContext();
    const image =
        character?.image ||
        (character?.assets.find((asset) => asset.name === "main")?.blob ??
            character?.assets[0].blob);
    const imageURL = useImageURL(image);

    return (
        <div className="flex flex-col relative">
            <Header className="sticky top-0 z-1 border-b bg-background/33 backdrop-blur max-sm:-mx-4 max-sm:px-4 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-16 **:data-[slot='breadcrumb']:hidden">
                {character && (
                    <div className="flex w-full justify-center items-center gap-2">
                        <img
                            src={imageURL}
                            alt={character?.data.name}
                            className="size-12 rounded-full object-cover"
                        />
                        <Link
                            to={"/characters/$id"}
                            params={{ id: character?.id }}
                        >
                            {character?.data.name}
                        </Link>
                    </div>
                )}
            </Header>

            {location.pathname === "/chat" ? (
                <SplashScreen />
            ) : (
                <ChatMessages />
            )}

            <div className="sticky bottom-4 sm:w-2xl @min-[1025px]:w-3xl sm:mx-auto">
                <SendForm />
            </div>
        </div>
    );
}
