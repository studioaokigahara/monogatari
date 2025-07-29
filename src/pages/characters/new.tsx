import Description from "@/components/characters/profile/description";
import ExampleDialogue from "@/components/characters/profile/example-dialogue";
import Greetings from "@/components/characters/profile/greetings";
import ProfileInfo from "@/components/characters/profile/info";
import Header from "@/components/header";
import LazyImage from "@/components/lazy-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CharacterFormProvider,
    CharacterFormValues,
    useCharacterForm
} from "@/contexts/character-form-context";
import { useImageURL } from "@/contexts/image-context";
import { CharacterManager } from "@/database/characters";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { nanoid } from "@/lib/utils";
import { router } from "@/router";
import { useField } from "@tanstack/react-form";
import { MessageSquareText, MessagesSquare, Text, Upload } from "lucide-react";
import { toast } from "sonner";

function CharacterCreator() {
    const { form } = useCharacterForm();
    const field = useField({ form, name: "image" });

    const imageURL = useImageURL(field.state.value);

    const { browse, input } = useFileDialog({
        accept: ".png, .jpeg, .webp",
        multiple: false,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) field.handleChange(new Blob([file], { type: file.type }));
        }
    });

    const uploadedImage = Boolean(field.state.value);

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
                    {uploadedImage ? (
                        <>
                            <LazyImage
                                imageURL={imageURL}
                                alt={form.state.values.name || "New Character"}
                                size="md:max-w-1/6 h-full"
                                className="object-cover rounded-xl cursor-pointer"
                                onClick={browse}
                            />
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
                    {field.state.meta.errors && (
                        <em className="text-destructive">
                            {field.state.meta.errors
                                .map((err) => err.message)
                                .join(",")}
                        </em>
                    )}
                    <ProfileInfo />
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
                        <Description />
                    </TabsContent>
                    <TabsContent value="greetings">
                        <Greetings />
                    </TabsContent>
                    <TabsContent value="example">
                        <ExampleDialogue />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function CharacterCreatorLayout() {
    const saveNewCharacter = async (values: CharacterFormValues) => {
        const id = nanoid();
        const { image: uploadedImage } = values;

        try {
            const data = {
                creation_date: new Date(),
                modified_date: new Date(),
                ...values
            };

            const assets = [
                {
                    blob: uploadedImage,
                    type: "icon" as const,
                    name: "main",
                    ext: uploadedImage.type.split("/")[1] || "png"
                }
            ];

            await CharacterManager.save(id, data, assets);
            toast.success(`${values.name} has been created successfully!`);
            router.navigate({ to: `/characters/${id}` });
        } catch (error) {
            console.error("Failed to save character:", error);
            toast.error("Failed to save character. Please try again.");
        }
    };

    return (
        <CharacterFormProvider
            initialValues={{}}
            mode="create"
            onSubmit={saveNewCharacter}
        >
            <CharacterCreator />
        </CharacterFormProvider>
    );
}
