import Description from "@/components/characters/profile/description";
import ExampleDialogue from "@/components/characters/profile/example-dialogue";
import Greetings from "@/components/characters/profile/greetings";
import ProfileInfo from "@/components/characters/profile/info";
import Header from "@/components/header";
import LazyImage from "@/components/lazy-image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImageURL } from "@/contexts/image-context";
import { CharacterManager } from "@/database/characters";
import { CharacterRecord } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { nanoid } from "@/lib/utils";
import { router } from "@/router";
import {
    MessageSquareText,
    MessagesSquare,
    Save,
    Text,
    Upload
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export default function CharacterCreator() {
    const [saving, setSaving] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<Blob | null>(null);
    const imageURL = useImageURL(uploadedImage);
    const [formData, setFormData] = useState<Partial<CharacterRecord["data"]>>({
        name: "",
        description: "",
        personality: "",
        scenario: "",
        first_mes: "",
        mes_example: "",
        alternate_greetings: [],
        creator_notes: "",
        tags: [],
        creator: "",
        nickname: ""
    });

    const updateFormData = useCallback(
        (updates: Partial<CharacterRecord["data"]>) => {
            setFormData((prev) => ({ ...prev, ...updates }));
        },
        []
    );

    const saveNewCharacter = async () => {
        if (!formData.name?.trim()) {
            toast.error("Please provide a name for your character");
            return;
        }

        if (!uploadedImage) {
            toast.error("Please upload an image for your character");
            return;
        }

        setSaving(true);

        try {
            const fullCharacterData = {
                name: formData.name!,
                description: "",
                personality: "",
                scenario: "",
                first_mes: "",
                mes_example: "",
                creator_notes: "",
                nickname: "",
                creator: "",
                system_prompt: "",
                post_history_instructions: "",
                alternate_greetings: [],
                character_book: undefined,
                tags: [],
                character_version: "1.0",
                extensions: {},
                assets: [
                    {
                        type: "icon" as const,
                        uri: "ccdefault://",
                        name: "main",
                        ext: "unknown"
                    }
                ],
                source: [],
                group_only_greetings: [],
                creation_date: new Date(),
                modification_date: new Date(),
                ...formData
            };

            const characterId = nanoid();
            const assets = uploadedImage
                ? [
                      {
                          blob: uploadedImage,
                          type: "icon" as const,
                          name: "main",
                          ext: uploadedImage.type.split("/")[1] || "png"
                      }
                  ]
                : [];

            await CharacterManager.save(characterId, fullCharacterData, assets);
            setSaving(false);

            toast.success(`${formData.name} has been created successfully!`);
            router.navigate({ to: `/characters/${characterId}` });
        } catch (error) {
            setSaving(false);
            console.error("Failed to save character:", error);
            toast.error("Failed to save character. Please try again.");
        }
    };

    const handleImageUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const blob = new Blob([file], { type: file.type });

        setUploadedImage(blob);
    };

    const { browse, input } = useFileDialog({
        accept: ".png, .jpeg, .webp",
        multiple: false,
        onChange: handleImageUpload
    });

    return (
        <>
            <div className="flex flex-col w-full">
                <Header />
                <div className="flex flex-col w-full md:max-w-5xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">
                                Create New Character
                            </h1>
                            <p className="text-muted-foreground">
                                Build your character from scratch
                            </p>
                        </div>
                        <Button
                            onClick={saveNewCharacter}
                            disabled={
                                saving ||
                                !formData.name?.trim() ||
                                !uploadedImage
                            }
                        >
                            {saving ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Character
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Cover Image and Profile Section */}
                    <div className="flex flex-col md:flex-row gap-4 md:items-end mb-4">
                        {uploadedImage ? (
                            <>
                                <LazyImage
                                    imageURL={imageURL}
                                    alt={formData.name || "New Character"}
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
                        <ProfileInfo
                            character={character}
                            editing={editing}
                            setEditing={setEditing}
                            newChat={startNewChat}
                            isNewMode={true}
                            formData={formData}
                            onUpdate={updateFormData}
                        />
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
                            <Description
                                character={character}
                                editing={editing}
                                isNewMode={true}
                                formData={formData}
                                onUpdate={updateFormData}
                            />
                        </TabsContent>
                        <TabsContent value="greetings">
                            <Greetings
                                character={character}
                                editing={editing}
                                isNewMode={true}
                                formData={formData}
                                onUpdate={updateFormData}
                            />
                        </TabsContent>
                        <TabsContent value="example">
                            <ExampleDialogue
                                character={character}
                                editing={editing}
                                isNewMode={true}
                                formData={formData}
                                onUpdate={updateFormData}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
}
