import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCharacterContext } from "@/contexts/character";
import { useCharacterFormContext } from "@/contexts/character-form";
import { Asset } from "@/database/schema/asset";
import { Character } from "@/database/schema/character";
import { characterFormOptions, useCharacterForm } from "@/hooks/use-character-form";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "@/routes/characters/components/avatar-cropper";
import { CharacterFormProvider } from "@/routes/characters/components/character-form-provider";
import { Description } from "@/routes/characters/components/description";
import { ExampleDialogue } from "@/routes/characters/components/example-dialogue";
import {
    DescriptionFields,
    ExampleDialogueField,
    GreetingsField,
    HeaderFields
} from "@/routes/characters/components/forms";
import Gallery from "@/routes/characters/components/gallery";
import { Greetings } from "@/routes/characters/components/greetings";
import { Header as ProfileHeader } from "@/routes/characters/components/header";
import {
    createFileRoute,
    useNavigate,
    useParams,
    useRouteContext,
    useSearch
} from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Edit, Images, MessageCircleMore, MessagesSquare, Text, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

function CharacterProfile({ character }: { character: Character }) {
    const { editing } = useCharacterFormContext();

    const imageURL = useImageURL({
        category: "character",
        id: character.id,
        assets: character.data.assets
    });

    const portrait = character.data.assets.find((asset) => asset.name === "portrait");
    const portraitURL = useImageURL({
        category: "character",
        id: character.id,
        assets: character.data.assets,
        filename: portrait ? `portrait.${portrait.ext}` : undefined
    });

    const [imageOpen, setImageOpen] = useState(false);
    const [cropperOpen, setCropperOpen] = useState(false);
    const [cropperImage, setCropperImage] = useState<File>();

    const replaceImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        await character.replaceMainAsset(file);

        setCropperImage(file);
        setImageOpen(false);
        setCropperOpen(true);
    };

    const editImage = async () => {
        const pointer = character.data.assets.find((asset) => asset.name === "main");
        if (pointer) {
            const asset = await Asset.load(character.id, `main.${pointer.ext}`);
            setCropperImage(asset.file);
            setImageOpen(false);
            setCropperOpen(true);
        }
    };

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: false,
        onChange: replaceImage
    });

    const form = useCharacterForm({
        ...characterFormOptions,
        defaultValues: { ...character.data },
        onSubmit: async ({ value }) => {
            await character.update(value);
            toast.success(`${character.data.name} saved.`);
        }
    });

    const { tab } = useSearch({ from: "/characters/$id" });
    const navigate = useNavigate({ from: "/characters/$id" });

    const setTab = (value: string) => {
        void navigate({
            search: {
                tab: value as "description" | "greetings" | "example" | "gallery"
            },
            mask: { search: undefined },
            replace: true
        });
    };

    return (
        <form
            className="flex w-full flex-col"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <Header />
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
                <Dialog open={imageOpen} onOpenChange={setImageOpen}>
                    <DialogTrigger asChild>
                        <Avatar className="size-[unset] h-64 overflow-visible">
                            <AvatarImage
                                src={portraitURL}
                                className={cn(
                                    "absolute -z-1 blur-3xl saturate-200",
                                    editing && "self-center"
                                )}
                            />
                            <AvatarImage
                                src={portraitURL}
                                alt={character.data.name}
                                className={cn(
                                    "aspect-[unset] cursor-pointer rounded-xl object-cover",
                                    editing && "self-center"
                                )}
                            />
                            <AvatarFallback className="rounded-xl">
                                <Skeleton className="aspect-square h-full" />
                            </AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    <DialogContent className="w-max sm:max-w-[80dvw]">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Main Character Image</DialogTitle>
                            <DialogDescription>Replace or edit main image</DialogDescription>
                        </DialogHeader>
                        <img
                            src={imageURL}
                            alt={character.data.name}
                            className="mx-auto max-h-[80dvh] rounded-xl"
                        />
                        <DialogFooter>
                            <Button onClick={browse}>
                                {input}
                                <Upload />
                                Replace
                            </Button>
                            <Button onClick={editImage}>
                                <Edit />
                                Edit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {cropperImage && (
                    <AvatarCropper
                        open={cropperOpen}
                        onOpenChange={setCropperOpen}
                        image={cropperImage}
                        imageURL={imageURL}
                        character={character}
                    />
                )}
                {editing ? <HeaderFields form={form} /> : <ProfileHeader character={character} />}
            </div>
            <Tabs value={tab ?? "description"} onValueChange={setTab} className="mb-2 gap-4">
                <TabsList className="sticky top-18 w-full max-sm:grid max-sm:h-auto max-sm:grid-cols-2 max-sm:grid-rows-2 max-sm:*:h-9 sm:top-2">
                    <TabsTrigger value="description">
                        <Text />
                        Description
                    </TabsTrigger>
                    <TabsTrigger value="greetings">
                        <MessageCircleMore />
                        Greetings
                    </TabsTrigger>
                    <TabsTrigger value="example">
                        <MessagesSquare />
                        Example Dialogue
                    </TabsTrigger>
                    {!editing && (
                        <TabsTrigger value="gallery">
                            <Images />
                            Gallery
                        </TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="description">
                    {editing ? (
                        <DescriptionFields form={form} />
                    ) : (
                        <Description character={character} />
                    )}
                </TabsContent>
                <TabsContent value="greetings">
                    {editing ? <GreetingsField form={form} /> : <Greetings character={character} />}
                </TabsContent>
                <TabsContent value="example">
                    {editing ? (
                        <ExampleDialogueField form={form} />
                    ) : (
                        <ExampleDialogue character={character} />
                    )}
                </TabsContent>
                {!editing && (
                    <TabsContent value="gallery">
                        <Gallery character={character} />
                    </TabsContent>
                )}
            </Tabs>
        </form>
    );
}

function CharacterProfileLayout() {
    const id = useParams({
        from: "/characters/$id",
        select: (params) => params.id
    });

    const fallback = useRouteContext({
        from: "/characters/$id",
        select: (context) => context.character
    });

    const character = useLiveQuery(() => Character.load(id), [id], fallback);

    const { setCharacter } = useCharacterContext();
    useEffect(() => setCharacter(character), [setCharacter, character]);

    return (
        <CharacterFormProvider mode="edit">
            <CharacterProfile character={character} />
        </CharacterFormProvider>
    );
}

export const Route = createFileRoute("/characters/$id")({
    component: CharacterProfileLayout,
    validateSearch: z.object({
        tab: z.enum(["description", "greetings", "example", "gallery"]).optional()
    }),
    beforeLoad: async ({ params: { id } }) => {
        const character = await Character.load(id);
        return { character, breadcrumb: character.data.name };
    },
    head: ({ match }) => ({
        meta: [{ title: `${match.context.breadcrumb} - Monogatari` }]
    })
});
