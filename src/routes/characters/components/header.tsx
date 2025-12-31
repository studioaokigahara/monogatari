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
import {
    ButtonGroup,
    ButtonGroupSeparator
} from "@/components/ui/button-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import { useCharacterContext } from "@/hooks/use-character-context";
import { useCharacterFormContext } from "@/hooks/use-character-form-context";
import { exportCharX } from "@/lib/character/io";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
    Edit,
    FileArchive,
    FileBracesCorner,
    FileImage,
    Heart,
    MessageCirclePlus,
    MoreVertical,
    Trash2
} from "lucide-react";
import { toast } from "sonner";

export function Header({ character }: { character: Character }) {
    const { persona } = useCharacterContext();
    const { setEditing } = useCharacterFormContext();
    const navigate = useNavigate();

    const startNewChat = async () => {
        const chat = new Chat(character, persona);
        await chat.save();
        void navigate({ to: "/chat/$id", params: { id: chat.id } });
    };

    const deleteCharacter = async () => {
        await character.delete();
        await navigate({ to: "/characters" });
        toast.success(`${character.data.name} deleted successfully.`);
    };

    const toggleFavorite = async () => {
        await character.toggleFavorite();
    };

    const exportCharacter = async () => {
        const charX = await exportCharX(character);
        const file = new File([charX], `${character.data.name}.charx`, {
            type: "application/zip"
        });
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                <TagList tags={character.data.tags} maxRows={1} />
            </div>
            <ButtonGroup className="[--radius:999rem]">
                <ButtonGroup>
                    <Button
                        type="button"
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
                    <ButtonGroupSeparator />
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setEditing(true)}
                    >
                        <Edit />
                    </Button>
                    <ButtonGroupSeparator />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" size="icon">
                                <Trash2 className="text-destructive" />
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
                    <ButtonGroupSeparator />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                            >
                                <MoreVertical className="mr-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportCharacter}>
                                <FileArchive />
                                Export as CharX
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                                <FileImage />
                                Export as PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                                <FileBracesCorner />
                                Export as JSON
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
        </div>
    );
}
