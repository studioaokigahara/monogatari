// import { StatusBadge } from "@/components/status-badge";
import { Prose } from "@/components/prose";
import { TagList } from "@/components/tags";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Heart, MessageCirclePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Header({ character }: { character: Character }) {
    const { persona } = useCharacterContext();
    const { setEditing } = useCharacterFormContext();
    const navigate = useNavigate();

    const startNewChat = async () => {
        const chat = new Chat(character, persona);
        await chat.save();
        navigate({ to: "/chat/$id", params: { id: chat.id } });
    };

    const deleteCharacter = async () => {
        await character.delete();
        navigate({ to: "/characters" });
        toast.success(`${character.data.name} deleted successfully.`);
    };

    const toggleFavorite = async () => {
        await character.toggleFavorite();
    };

    return (
        <div className="flex flex-col md:flex-row w-full justify-between items-start md:items-end gap-4 rounded-xl z-1">
            <div className="grow">
                <p className="text-3xl font-bold">
                    {character?.data.name}
                    <span className="text-xl text-muted-foreground font-medium">
                        {" "}
                        {character.data.nickname}
                    </span>
                </p>
                <p className="text-muted-foreground">
                    by{" "}
                    <span className="font-medium">
                        {character.data.creator}
                    </span>
                    {character.data.character_version && (
                        <>
                            , version{" "}
                            <span className="font-medium">
                                {character.data.character_version}
                            </span>
                        </>
                    )}
                </p>
                {/* TODO: better styling, allow user defined statuses (store in extensions) */}
                {/*<StatusBadge />*/}
                <Prose className="text-sm text-foreground my-[0.5lh] max-w-[unset]">
                    {character.data.extensions.monogatari?.tagline ??
                        character.data.creator_notes}
                </Prose>
                <TagList
                    variant="outline"
                    tags={character.data.tags}
                    maxRows={1}
                />
            </div>
            <ButtonGroup className="[--radius:999rem]">
                <ButtonGroup>
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={toggleFavorite}
                    >
                        <Heart
                            className={cn(
                                character.favorite
                                    ? "text-pink-400 animate-icon-bounce"
                                    : ""
                            )}
                            fill={character.favorite ? "currentColor" : "none"}
                        />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setEditing(true)}
                    >
                        <Edit />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="secondary">
                                <Trash2 />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete{" "}
                                    {character.data.name}. This cannot be
                                    undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({
                                        variant: "destructive"
                                    })}
                                    onClick={deleteCharacter}
                                >
                                    Delete!
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </ButtonGroup>
                <ButtonGroup>
                    <Button size="icon" onClick={startNewChat}>
                        <MessageCirclePlus />
                    </Button>
                </ButtonGroup>
            </ButtonGroup>
        </div>
    );
}
