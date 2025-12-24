import {
    Description,
    DescriptionFields
} from "@/routes/characters/components/description";
import {
    ExampleDialogue,
    ExampleDialogueField
} from "@/routes/characters/components/example-dialogue";
import Gallery from "@/routes/characters/components/gallery";
import {
    Greetings,
    GreetingsField
} from "@/routes/characters/components/greetings";
import {
    Header as ProfileHeader,
    HeaderFields
} from "@/routes/characters/components/header";
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
import { useCharacterContext } from "@/contexts/character-context";
import {
    CharacterFormProvider,
    useCharacterFormContext
} from "@/contexts/character-form-context";
import { Character } from "@/database/schema/character";
import {
    characterFormOptions,
    useCharacterForm
} from "@/hooks/use-character-form";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { cn } from "@/lib/utils";
import {
    createFileRoute,
    useNavigate,
    useParams,
    useRouteContext
} from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
    Edit,
    Images,
    MessageCircleMore,
    MessagesSquare,
    Text,
    Upload
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";
import z from "zod";

function CharacterProfile({ character }: { character: Character }) {
    const { setCharacter } = useCharacterContext();
    const { editing } = useCharacterFormContext();

    const imageURL = useImageURL({
        category: "character",
        id: character.id,
        assets: character.data.assets
    });

    useEffect(() => {
        setCharacter(character);
    }, [character, setCharacter]);

    const replaceImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const pointer =
            character.data.assets.find((asset) => asset.type === "icon") ??
            character.data.assets[0];
        const fileName = `${pointer.name}.${pointer.ext}`;
        await character.replaceAsset(fileName, file);
    };

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: false,
        onChange: replaceImage
    });

    const form = useCharacterForm({
        ...characterFormOptions,
        defaultValues: { ...character.data, image: undefined },
        onSubmit: async ({ value }) => {
            await character.update(value);
            toast.success(`${character.data.name} saved.`);
        }
    });

    const { tab } = useSearch({ from: "/characters/$id" });
    const navigate = useNavigate({ from: "/characters/$id" });

    const setTab = (value: string) => {
        navigate({
            search: {
                tab: value as
                    | "description"
                    | "greetings"
                    | "example"
                    | "gallery"
            },
            mask: { search: undefined }
        });
    };

    return (
        <form
            className="flex flex-col w-full"
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
        >
            <Header />
            <div className="flex flex-col md:flex-row gap-4 md:items-end mb-4">
                <Dialog>
                    <DialogTrigger asChild>
                        <Avatar className="size-[unset] h-64 overflow-visible">
                            <AvatarImage
                                src={imageURL}
                                className={cn(
                                    "absolute blur-3xl saturate-200 -z-1",
                                    editing && "self-center"
                                )}
                            />
                            <AvatarImage
                                src={imageURL}
                                alt={character.data.name}
                                className={cn(
                                    "aspect-[unset] object-cover rounded-xl cursor-pointer",
                                    editing && "self-center"
                                )}
                            />
                            <AvatarFallback className="rounded-xl">
                                <Skeleton className="h-full aspect-square" />
                            </AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader className="sr-only">
                            <DialogTitle>Main Character Image</DialogTitle>
                            <DialogDescription>
                                Replace or edit main image
                            </DialogDescription>
                        </DialogHeader>
                        <img
                            src={imageURL}
                            alt={character.data?.name}
                            className="max-h-[80dvh] rounded-xl mx-auto"
                        />
                        <DialogFooter>
                            <Button className="w-1/2" onClick={browse}>
                                {input}
                                <Upload />
                                Replace
                            </Button>
                            <Button className="w-1/2">
                                <Edit />
                                Edit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {editing ? (
                    <HeaderFields form={form} />
                ) : (
                    <ProfileHeader character={character} />
                )}
            </div>

            {/* Main Content */}
            <Tabs
                defaultValue="description"
                value={tab}
                onValueChange={setTab}
                className="gap-4 mb-2"
            >
                <TabsList className="sticky top-1 w-full">
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
                    {editing ? (
                        <GreetingsField form={form} />
                    ) : (
                        <Greetings character={character} />
                    )}
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
        select: (context) => context.character!
    });

    const character = useLiveQuery(() => Character.load(id), [], fallback);

    return (
        <CharacterFormProvider mode="edit">
            <CharacterProfile character={character} />
        </CharacterFormProvider>
    );
}

export const Route = createFileRoute("/characters/$id")({
    component: CharacterProfileLayout,
    validateSearch: z.object({
        tab: z
            .enum(["description", "greetings", "example", "gallery"])
            .optional()
    }),
    head: ({ match }) => ({
        meta: [{ title: `${match.context.breadcrumb} — Monogatari` }]
    }),
    beforeLoad: async ({ params: { id } }) => {
        const character = await Character.load(id);
        return { character, breadcrumb: character.data.name };
    }
});
