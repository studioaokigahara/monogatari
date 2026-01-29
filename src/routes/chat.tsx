import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { useCharacterContext } from "@/contexts/character";
import { useImageURL } from "@/hooks/use-image-url";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

function ChatLayout() {
    const { character } = useCharacterContext();

    const avatar = character?.data.assets.find((asset) => asset.name === "avatar");
    const imageURL = useImageURL(
        character
            ? {
                  category: "character",
                  id: character.id,
                  assets: character.data.assets,
                  filename: avatar ? `avatar.${avatar.ext}` : undefined
              }
            : undefined
    );

    return (
        <div className="relative flex grow flex-col">
            <Header className="sticky top-0 z-1 border-b bg-background/33 backdrop-blur group-has-data-[collapsible=icon]/sidebar-wrapper:h-16 **:data-[slot='breadcrumb']:hidden max-sm:-mx-4 max-sm:px-4">
                {character && (
                    <div className="flex w-full items-center justify-center gap-2">
                        <Dialog>
                            <DialogTrigger
                                render={
                                    <Avatar className="size-12 cursor-pointer">
                                        <AvatarImage
                                            src={imageURL}
                                            alt={character?.data.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback>
                                            {character?.data.name.slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                }
                            />
                            <DialogContent>
                                <DialogHeader className="sr-only">
                                    <DialogTitle>{character?.data.name}</DialogTitle>
                                    <DialogDescription>{character?.data.name}</DialogDescription>
                                </DialogHeader>
                                <img
                                    src={imageURL}
                                    alt={character.data?.name}
                                    className="mx-auto max-h-[80dvh] rounded-xl"
                                />
                            </DialogContent>
                        </Dialog>
                        <Link to={"/characters/$id"} params={{ id: character?.id }}>
                            {character?.data.name}
                        </Link>
                    </div>
                )}
            </Header>
            <Outlet />
        </div>
    );
}

export const Route = createFileRoute("/chat")({
    component: ChatLayout,
    beforeLoad: () => ({
        breadcrumb: "Chat"
    })
});
