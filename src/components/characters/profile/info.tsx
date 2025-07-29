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
import { useCharacterForm } from "@/contexts/character-form-context";
import { CharacterManager } from "@/database/characters";
import { ChatManager } from "@/database/chats";
import { CharacterRecord } from "@/database/schema/character";
import { useNavigate } from "@tanstack/react-router";
import { Edit, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface InfoProps {
    character?: CharacterRecord | null;
}

export default function ProfileInfo({ character }: InfoProps) {
    const { form, mode, editing, setEditing } = useCharacterForm();
    const navigate = useNavigate();

    const startNewChat = async () => {
        const graph = ChatManager.createChatGraph(character!);
        await ChatManager.saveGraph(graph, [character!.id]);
        navigate({ to: "/chat/$id", params: { id: graph.id } });
    };

    const handleCancel = () => {
        switch (mode) {
            case "create": {
                navigate({ to: "/characters" });
                break;
            }
            case "edit": {
                form.reset();
                setEditing(false);
                break;
            }
        }
    };

    if (editing)
        return (
            <div className="flex flex-col w-full gap-4 p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form.Field
                        name="name"
                        children={(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Name
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    />
                    <form.Field
                        name="nickname"
                        children={(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Nickname
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    />
                    <form.Field
                        name="creator"
                        children={(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Creator
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    />
                    <form.Field
                        name="creator_notes"
                        children={(field) => (
                            <div className="md:col-span-2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Creator Notes
                                </label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    />
                </div>

                <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <form.Subscribe
                        selector={(state) => [
                            state.canSubmit,
                            state.isSubmitting
                        ]}
                        children={([canSubmit, isSubmitting]) => (
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                onClick={() => {
                                    form.handleSubmit();
                                    setEditing(false);
                                }}
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </Button>
                        )}
                    />
                </div>
            </div>
        );

    return (
        <div className="flex flex-col md:flex-row w-full justify-between items-start md:items-end gap-4 rounded-xl">
            <div className="grow">
                <p className="text-2xl md:text-3xl font-bold">
                    {character?.data.name}
                </p>
                <p className="text-xl text-muted-foreground">
                    {character?.data.nickname}
                </p>
                <div className="flex gap-2">
                    <p className="text-muted-foreground text-sm">
                        by{" "}
                        <span className="font-medium">
                            {character?.data.creator}
                        </span>
                    </p>
                    <StatusBadge />
                </div>
                <p className="text-muted-foreground text-sm m-[revert]">
                    {character?.data.creator_notes}
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
                    className="w-9 rounded-full"
                    onClick={startNewChat}
                >
                    <MessageSquare />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    className="w-9 rounded-full"
                    onClick={() => setEditing(true)}
                >
                    <Edit />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="icon"
                            variant="destructive"
                            className="w-9 rounded-full"
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
                                    navigate({
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
