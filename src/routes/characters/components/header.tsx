// import { StatusBadge } from "@/components/status-badge";
import { Markdown } from "@/components/markdown";
import { TagList } from "@/components/tag-list";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useCharacterContext } from "@/contexts/character";
import { useCharacterFormContext } from "@/contexts/character-form";
import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import { exportCharX, exportJSON, exportPNG } from "@/lib/character/io";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
    Edit,
    FileArchive,
    FileBracesCorner,
    FileDown,
    FileImage,
    Heart,
    MessageCirclePlus,
    MoreVertical,
    Trash2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function Header({ character }: { character: Character }) {
    const { persona } = useCharacterContext();
    const { setEditing } = useCharacterFormContext();

    const [dialogOpen, setDialogOpen] = useState(false);

    const navigate = useNavigate();

    const startNewChat = async () => {
        const chat = new Chat(character, persona);
        await chat.save();
        void navigate({ to: "/chat/$id", params: { id: chat.id } });
    };

    const deleteCharacter = async () => {
        void navigate({ to: "/characters" });
        await character.delete();
        toast.success(`${character.data.name} deleted successfully.`);
    };

    const toggleFavorite = async () => {
        await character.toggleFavorite();
    };

    return (
        <div className="z-1 flex w-full flex-col items-start justify-between gap-4 rounded-xl md:flex-row md:items-end">
            <div className="grow">
                <p className="text-3xl font-bold">
                    {character?.data.name}
                    <span className="text-xl font-medium text-muted-foreground">
                        {" "}
                        {character.data.nickname}
                    </span>
                </p>
                <p className="text-muted-foreground">
                    by <span className="font-medium">{character.data.creator}</span>
                    {character.data.character_version && (
                        <>
                            , version{" "}
                            <span className="font-medium">{character.data.character_version}</span>
                        </>
                    )}
                </p>
                {/* TODO: better styling, allow user defined statuses (store in extensions) */}
                {/*<StatusBadge />*/}
                <Markdown className="my-[0.5lh] max-w-[unset] text-sm text-foreground">
                    {character.data.extensions.monogatari?.tagline ?? character.data.creator_notes}
                </Markdown>
                {character.data.tags.length > 0 && (
                    <TagList tags={character.data.tags} maxRows={1} />
                )}
            </div>
            <ButtonGroup className="[--radius:999rem]">
                <ButtonGroup className="rounded-full! bg-secondary">
                    <Button type="button" size="icon" variant="outline" onClick={toggleFavorite}>
                        <Heart
                            className={cn(
                                character.favorite ? "animate-icon-bounce text-pink-400" : ""
                            )}
                            fill={character.favorite ? "currentColor" : "none"}
                        />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setEditing(true)}
                    >
                        <Edit />
                    </Button>
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                            render={<Button type="button" variant="outline" size="icon" />}
                        >
                            <MoreVertical className="mr-1" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <FileDown />
                                    Export
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => exportCharX(character)}>
                                        <FileArchive />
                                        CharX
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportPNG(character)}>
                                        <FileImage />
                                        PNG
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportJSON(character)}>
                                        <FileBracesCorner />
                                        JSON
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDialogOpen(true)}
                            >
                                <Trash2 />
                                Delete...
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ButtonGroup>
                <ButtonGroup>
                    <Button type="button" size="icon" onClick={startNewChat}>
                        <MessageCirclePlus />
                    </Button>
                </ButtonGroup>
            </ButtonGroup>
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {character.data.name} and all associated
                            chats, lorebooks, and assets. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={deleteCharacter}>
                            Delete!
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
