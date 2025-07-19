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
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharacterManager } from "@/database/characters";
import { db } from "@/database/database";
import { CharacterRecord } from "@/database/schema/character";
import { router } from "@/router";
import { Edit, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InfoProps {
    character: CharacterRecord | null;
    editing: boolean;
    setEditing: React.Dispatch<React.SetStateAction<boolean>>;
    newChat: () => void;
    isNewMode?: boolean;
    formData?: Partial<CharacterRecord["data"]>;
    onUpdate?: (data: Partial<CharacterRecord["data"]>) => void;
}

export default function ProfileInfo({
    character,
    editing,
    setEditing,
    newChat,
    isNewMode = false,
    formData,
    onUpdate
}: InfoProps) {
    const getInitialValue = (field: keyof CharacterRecord["data"]) => {
        if (isNewMode && formData) {
            return formData[field];
        }
        if (character) {
            return character.data[field];
        }
        return "";
    };

    const [name, setName] = useState(getInitialValue("name"));
    const [nickname, setNickname] = useState(getInitialValue("nickname"));
    const [creator, setCreator] = useState(getInitialValue("creator"));
    const [creatorNotes, setCreatorNotes] = useState(
        getInitialValue("creator_notes")
    );

    const save = async () => {
        if (isNewMode && onUpdate) {
            onUpdate({
                name,
                nickname,
                creator,
                creator_notes: creatorNotes
            });
            setEditing(false);
            return;
        }

        if (!character) return;
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
        setName(getInitialValue("name"));
        setNickname(getInitialValue("nickname"));
        setCreator(getInitialValue("creator"));
        setCreatorNotes(getInitialValue("creator_notes"));
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
                            onChange={(e) => {
                                setName(e.currentTarget.value);
                                if (isNewMode && onUpdate) {
                                    onUpdate({ name: e.currentTarget.value });
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">
                            Nickname
                        </label>
                        <Input
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.currentTarget.value);
                                if (isNewMode && onUpdate) {
                                    onUpdate({
                                        nickname: e.currentTarget.value
                                    });
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">
                            Creator
                        </label>
                        <Input
                            value={creator}
                            onChange={(e) => {
                                setCreator(e.currentTarget.value);
                                if (isNewMode && onUpdate) {
                                    onUpdate({
                                        creator: e.currentTarget.value
                                    });
                                }
                            }}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground">
                            Tagline
                        </label>
                        <Textarea
                            value={creatorNotes}
                            onChange={(e) => {
                                setCreatorNotes(e.currentTarget.value);
                                if (isNewMode && onUpdate) {
                                    onUpdate({
                                        creator_notes: e.currentTarget.value
                                    });
                                }
                            }}
                        />
                    </div>
                </div>

                {!isNewMode && (
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={cancel}>
                            Cancel
                        </Button>
                        <Button onClick={save}>Save</Button>
                    </div>
                )}
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
                    tags={character!.data.tags}
                    maxRows={1}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Button
                    size="icon"
                    className="w-9 rounded-full cursor-pointer"
                    onClick={newChat}
                >
                    <MessageSquare />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    className="w-9 rounded-full cursor-pointer"
                    onClick={() => setEditing(true)}
                >
                    <Edit />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="icon"
                            variant="destructive"
                            className="w-9 rounded-full cursor-pointer"
                        >
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
                                {character!.data.name}. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={async () => {
                                    await CharacterManager.delete(
                                        character!.id
                                    );
                                    router.navigate({
                                        to: "/characters"
                                    });
                                    toast.success(
                                        `${character!.data.name} deleted successfully.`
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
