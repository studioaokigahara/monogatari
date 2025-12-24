import { DescriptionFields } from "@/routes/characters/components/description";
import { ExampleDialogueField } from "@/routes/characters/components/example-dialogue";
import { GreetingsField } from "@/routes/characters/components/greetings";
import { HeaderFields } from "@/routes/characters/components/header";
import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterFormProvider } from "@/contexts/character-form-context";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { router } from "@/lib/router";
import { MessageSquareText, MessagesSquare, Text, Upload } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Character } from "@/database/schema/character";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
    characterFormOptions,
    useCharacterForm
} from "@/hooks/use-character-form";
import { Asset } from "@/database/schema/asset";

function CharacterCreator() {
    const form = useCharacterForm({
        ...characterFormOptions,
        onSubmit: async ({ value }) => {
            const uploadedImage = imageBlob;
            if (!uploadedImage) {
                toast.error("Please upload an image.");
                return;
            }

            try {
                const data = {
                    ...value,
                    creation_date: new Date(),
                    modification_date: new Date()
                };

                const character = new Character({ data });
                await character.save();
                const asset = new Asset({
                    category: "character",
                    parentID: character.id,
                    file: new File(
                        [uploadedImage],
                        `main.${uploadedImage?.type.split("/")[1] ?? "png"}`,
                        { type: uploadedImage.type }
                    )
                });
                await asset.save();
                toast.success(`${value.name} has been created successfully!`);
                router.navigate({ to: `/characters/${character.id}` });
            } catch (error) {
                console.error("Failed to save character:", error);
                toast.error("Failed to save character. Please try again.");
            }
        }
    });

    const [imageBlob, setImageBlob] = useState<Blob>();
    const [imageURL, setImageURL] = useState("");

    useEffect(() => {
        if (!imageBlob) {
            setImageURL("");
            return;
        }

        const url = URL.createObjectURL(imageBlob);
        setImageURL(url);

        return () => URL.revokeObjectURL(url);
    }, [imageBlob]);

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: false,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) setImageBlob(file);
        }
    });

    return (
        <div className="flex flex-col w-full">
            <Header />
            <div className="flex flex-col w-full md:max-w-5xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Create New Character
                        </h1>
                    </div>
                </div>

                {/* Cover Image and Profile Section */}
                <div className="flex flex-col md:flex-row gap-4 md:items-end mb-4">
                    {imageBlob ? (
                        <>
                            <Avatar className="h-full md:max-w-1/6">
                                <AvatarImage
                                    src={imageURL}
                                    alt={form.state.values.name}
                                    className="object-cover rounded-xl cursor-pointer"
                                    onClick={browse}
                                />
                                <AvatarFallback>
                                    <Skeleton />
                                </AvatarFallback>
                            </Avatar>
                            {input}
                        </>
                    ) : (
                        <div
                            className="shrink-0 md:w-1/6 h-full rounded-xl bg-muted/50 flex flex-col items-center justify-center py-4 cursor-pointer border-2 border-dashed hover:bg-muted/70 transition-colors"
                            onClick={browse}
                        >
                            {input}
                            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground text-center">
                                Click to upload image
                                <br />
                                <span className="text-xs">(Required)</span>
                            </span>
                        </div>
                    )}
                    <HeaderFields form={form} />
                </div>

                {/* Main Content */}
                <Tabs defaultValue="description" className="gap-4 mb-4">
                    <TabsList className="w-full bg-muted/50">
                        <TabsTrigger value="description">
                            <Text />
                            Description
                        </TabsTrigger>
                        <TabsTrigger value="greetings">
                            <MessageSquareText />
                            Greetings
                        </TabsTrigger>
                        <TabsTrigger value="example">
                            <MessagesSquare />
                            Example Dialogue
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="description">
                        <DescriptionFields form={form} />
                    </TabsContent>
                    <TabsContent value="greetings">
                        <GreetingsField form={form} />
                    </TabsContent>
                    <TabsContent value="example">
                        <ExampleDialogueField form={form} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function CharacterCreatorLayout() {
    return (
        <CharacterFormProvider mode="create">
            <CharacterCreator />
        </CharacterFormProvider>
    );
}

export const Route = createFileRoute("/characters/new")({
    component: CharacterCreatorLayout,
    beforeLoad: () => ({
        breadcrumb: "New Character"
    })
});
