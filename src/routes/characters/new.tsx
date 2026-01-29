import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Asset } from "@/database/schema/asset";
import { Character } from "@/database/schema/character";
import { useAppForm } from "@/hooks/use-app-form";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { getFileExtension } from "@/lib/utils";
import { CharacterFormProvider } from "@/routes/characters/components/character-form-provider";
import {
    DescriptionFields,
    ExampleDialogueField,
    GreetingsField,
    HeaderFields
} from "@/routes/characters/components/forms";
import { characterFormOptions } from "@/types/character-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquareText, MessagesSquare, Text, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function CharacterCreator() {
    const [image, setImage] = useState<File>();
    const [imageURL, setImageURL] = useState("");

    useEffect(() => {
        if (!image) {
            setImageURL("");
            return;
        }

        const url = URL.createObjectURL(image);
        setImageURL(url);

        return () => URL.revokeObjectURL(url);
    }, [image]);

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: false,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) setImage(file);
        }
    });

    const navigate = useNavigate();

    const form = useAppForm({
        ...characterFormOptions,
        onSubmit: async ({ value }) => {
            if (!image) {
                toast.error("Please upload an image.");
                return;
            }

            try {
                const data = {
                    ...value,
                    creation_date: new Date(),
                    modification_date: new Date()
                };

                const ext = getFileExtension(image.name);

                data.assets = [
                    {
                        type: "icon",
                        uri: "ccdefault:",
                        name: "main",
                        ext: ext
                    }
                ];

                const character = new Character(data);
                await character.save();

                const asset = new Asset({
                    category: "character",
                    parentID: character.id,
                    file: new File([image], `main.${ext}`, {
                        type: image.type
                    })
                });

                await asset.save();
                toast.success(`${value.name} has been created successfully!`);
                void navigate({
                    to: "/characters/$id",
                    params: { id: character.id }
                });
            } catch (error) {
                console.error("Failed to save character:", error);
                toast.error("Failed to save character. Please try again.");
            }
        }
    });

    return (
        <div className="flex w-full flex-col">
            <Header />
            <div className="mx-auto flex w-full flex-col px-4 md:max-w-5xl">
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
                    {image ? (
                        <Avatar className="h-full md:max-w-1/6">
                            <AvatarImage
                                src={imageURL}
                                alt={form.state.values.name}
                                className="cursor-pointer rounded-xl object-cover"
                                onClick={browse}
                            />
                            <AvatarFallback>
                                <Skeleton />
                            </AvatarFallback>
                            {input}
                        </Avatar>
                    ) : (
                        <Button
                            variant="secondary"
                            className="flex h-full shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/50 py-4 transition-colors hover:bg-muted/70 md:w-1/6"
                            onClick={browse}
                        >
                            {input}
                            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                            <span className="text-center text-sm text-muted-foreground">
                                Click to upload image
                                <br />
                                <span className="text-xs">(Required)</span>
                            </span>
                        </Button>
                    )}
                    <HeaderFields form={form} />
                </div>
                <Tabs defaultValue="description" className="mb-4 gap-4">
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
