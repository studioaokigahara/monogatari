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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCharacterFormContext } from "@/contexts/character-form-context";
import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import {
    characterFormOptions,
    withCharacterForm
} from "@/hooks/use-character-form";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Trash2, Heart, MessageCirclePlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
    character: Character;
}

export function Header({ character }: Props) {
    const { setEditing } = useCharacterFormContext();
    const navigate = useNavigate();

    const startNewChat = async () => {
        const chat = new Chat(character);
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

export const HeaderFields = withCharacterForm({
    ...characterFormOptions,
    render: function Render({ form }) {
        const { mode, setEditing } = useCharacterFormContext();
        const navigate = useNavigate();

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

        return (
            <div className="flex flex-col w-full gap-4 rounded-xl z-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form.AppField name="name">
                        {(field) => (
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
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="nickname">
                        {(field) => (
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
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="creator">
                        {(field) => (
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
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="character_version">
                        {(field) => (
                            <div>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Version
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="number"
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                    {/* TODO: combobox tag selection, central DB store with
                    editing/tag coloring/etc */}
                    <form.AppField name="tags">
                        {(field) => (
                            <div className="md:col-span-2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Tags
                                </label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    // @ts-expect-error withForm does not narrow types
                                    value={field.state.value.join(", ")}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.target.value.split(", ")
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors && (
                                    <em className="text-destructive">
                                        {field.state.meta.errors
                                            // @ts-expect-error withForm does not narrow types
                                            .map((err) => err.message)
                                            .join(",")}
                                    </em>
                                )}
                            </div>
                        )}
                    </form.AppField>
                </div>
                <div className="flex gap-2">
                    <form.AppField name="creator_notes">
                        {(field) => (
                            <div className="w-1/2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Creator Notes
                                </label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <form.AppField name="extensions.monogatari.tagline">
                        {(field) => (
                            <div className="w-1/2">
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-muted-foreground"
                                >
                                    Tagline
                                </label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value as string}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.AppField>
                    <div className="flex gap-2 items-end">
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <form.Subscribe
                            selector={(state) => [
                                state.canSubmit,
                                state.isSubmitting
                            ]}
                        >
                            {([canSubmit, isSubmitting]) => (
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
                        </form.Subscribe>
                    </div>
                </div>
            </div>
        );
    }
});
