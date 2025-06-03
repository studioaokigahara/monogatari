import Description from "@/components/characters/profile/description";
import ExampleDialogue from "@/components/characters/profile/example-dialogue";
import Gallery from "@/components/characters/profile/gallery";
import Greetings from "@/components/characters/profile/greetings";
import ProfileInfo from "@/components/characters/profile/info";
import Header from "@/components/header";
import LazyImage from "@/components/lazy-image";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCharacterContext } from "@/contexts/character-context";
import { useImageURL } from "@/contexts/image-context";
import { replaceAssetBlob } from "@/database/characters";
import { saveGraph } from "@/database/chats";
import { CharacterRecord } from "@/database/schema/character";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { replaceMacros } from "@/lib/curly-braces";
import { characterProfileRoute, router } from "@/router";
import { ConversationGraph } from "@/types/conversation-graph";
import {
    Edit,
    Images,
    MessageSquareText,
    MessagesSquare,
    Text,
    Upload
} from "lucide-react";
import { useEffect, useState } from "react";

export default function CharacterProfile() {
    const character: CharacterRecord =
        characterProfileRoute.useMatch().context.character!;
    const { setCharacter } = useCharacterContext();
    const image =
        character.assets.find((asset) => asset.name === "main")?.blob ??
        character.assets[0].blob;
    const [currentImage, setCurrentImage] = useState(image);
    const imageURL = useImageURL(currentImage);

    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setCharacter(character);
    }, [character, setCharacter]);

    const startNewChat = async () => {
        const now = new Date();
        const systemMessage = {
            id: "character_definitions",
            role: "system" as const,
            content: replaceMacros(character.data.description, {
                character
            }),
            createdAt: now
        };

        const graph = new ConversationGraph([systemMessage]);

        const allGreetings = [
            character.data.first_mes,
            ...(character.data.alternate_greetings || [])
        ];

        allGreetings.forEach((greeting, index) => {
            const greetingMessage = {
                id: `greeting-${index + 1}`,
                role: "assistant" as const,
                content: replaceMacros(greeting, { character }),
                createdAt: now
            };

            const newVertexID = graph.branchFrom(graph.id, [greetingMessage]);
            if (index === 0) graph.setActiveVertex(newVertexID);
        });

        await saveGraph(graph, [character.id]);
        router.navigate({ to: "/chat/$id", params: { id: graph.id } });
    };

    const handleImageUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const blob = new Blob([file], { type: file.type });
        const ext = file.type.split("/")[1];
        await replaceAssetBlob(character.id, "main", blob, ext);
        setCurrentImage(blob);
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
                    {/* Cover Image and Profile Section */}
                    <div className="flex flex-col md:flex-row gap-4 md:items-end mb-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <LazyImage
                                    imageURL={imageURL}
                                    alt={character.data?.name}
                                    size="md:max-w-1/6 h-full"
                                    className="object-cover rounded-xl cursor-pointer"
                                />
                            </DialogTrigger>
                            <DialogContent>
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
                        <ProfileInfo
                            character={character}
                            editing={editing}
                            setEditing={setEditing}
                            newChat={startNewChat}
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
                            <TabsTrigger value="gallery">
                                <Images />
                                Gallery
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="description">
                            <Description
                                character={character}
                                editing={editing}
                            />
                        </TabsContent>
                        <TabsContent value="greetings">
                            <Greetings
                                character={character}
                                editing={editing}
                            />
                        </TabsContent>
                        <TabsContent value="example">
                            <ExampleDialogue
                                character={character}
                                editing={editing}
                            />
                        </TabsContent>
                        <TabsContent value="gallery">
                            <Gallery character={character} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
}
