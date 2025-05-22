import { StatusBadge } from "@/components/status-badge";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { router } from "@/router";
import { Edit, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InfoProps {
    character: CharacterRecord;
    editing: boolean;
    setEditing: React.Dispatch<React.SetStateAction<boolean>>;
    newChat: () => void;
}

export default function ProfileInfo({
    character,
    editing,
    setEditing,
    newChat,
}: InfoProps) {
    const [name, setName] = useState(character.data.name);
    const [nickname, setNickname] = useState(character.data.nickname);
    const [creator, setCreator] = useState(character.data.creator);
    const [creatorNotes, setCreatorNotes] = useState(
        character.data.creator_notes || "",
    );

    const save = async () => {
        await db.characters
            .where("id")
            .equals(character.id)
            .modify((record) => {
                record.data.name = name;
                record.data.nickname = nickname;
                record.data.creator = creator;
                record.data.creator_notes = creatorNotes;
            });
        toast.success("Info saved.");
        setEditing(false);
    };

    const cancel = () => {
        setName(character.data.name);
        setNickname(character.data.nickname);
        setCreator(character.data.creator);
        setCreatorNotes(character.data.creator_notes || "");
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex flex-col w-full gap-4 p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">
                            Name
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.currentTarget.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">
                            Nickname
                        </label>
                        <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.currentTarget.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">
                            Creator
                        </label>
                        <Input
                            value={creator}
                            onChange={(e) => setCreator(e.currentTarget.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground">
                            Creator Notes / Tagline
                        </label>
                        <Textarea
                            value={creatorNotes}
                            onChange={(e) =>
                                setCreatorNotes(e.currentTarget.value)
                            }
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={cancel}>
                        Cancel
                    </Button>
                    <Button onClick={save}>Save</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row w-full justify-between items-start md:items-end gap-4 rounded-xl">
            <div className="grow">
                <p className="text-2xl md:text-3xl font-bold">{name}</p>
                <p className="text-xl text-muted-foreground">{nickname}</p>
                <div className="flex gap-2">
                    <p className="text-muted-foreground text-sm">
                        by <span className="font-medium">{creator}</span>
                    </p>
                    <StatusBadge />
                </div>
                <p className="text-muted-foreground text-sm m-[revert]">
                    {creatorNotes}
                </p>
                <TagList
                    variant="outline"
                    tags={character.data.tags}
                    maxRows={1}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Button size="sm" onClick={newChat}>
                    <MessageSquare />
                    Message
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(true)}
                >
                    <Edit /> Edit
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                            <Trash2 />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete{" "}
                                {character.data.name}. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    db.characters.delete(character.id);
                                    router.navigate({
                                        to: "/characters",
                                    });
                                    toast.success(
                                        `${character.data.name} deleted successfully.`,
                                    );
                                }}
                            >
                                Delete!
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
