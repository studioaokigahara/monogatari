import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCharacterContext } from "@/contexts/character-context";
import { db } from "@/database/database";
import { PersonaRecord } from "@/database/schema/persona";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { nanoid } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PersonaImageProps {
    imageURL: string | null;
    onImageClick: () => void;
}

function PersonaImage({ imageURL, onImageClick }: PersonaImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    // useEffect(() => {
    //     setImageLoaded(false);
    // }, [imageURL]);

    return (
        <>
            {imageURL && (
                <img
                    src={imageURL}
                    className="w-48 h-48 object-cover rounded-xl cursor-pointer"
                    onClick={onImageClick}
                    onLoad={() => setImageLoaded(true)}
                />
            )}
            {(!imageURL || !imageLoaded) && (
                <div
                    onClick={onImageClick}
                    className="w-48 h-48 rounded-xl bg-muted flex items-center justify-center cursor-pointer gap-2"
                >
                    <Upload />
                    No Image
                </div>
            )}
        </>
    );
}

export default function PersonaEditor() {
    const personas = useLiveQuery(() => db.personas.toArray(), []);
    const { persona, setPersona } = useCharacterContext();
    const [localPersona, setLocalPersona] = useState<PersonaRecord>(persona!);
    const localImageURL = useImageURL(localPersona?.blob);

    const blobs = useMemo(
        () => personas?.map((persona) => persona.blob),
        [personas],
    );

    const personaURLs = useImageURL(blobs!);

    useEffect(() => {
        setLocalPersona(persona!);
    }, [persona]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setLocalPersona((prev) => ({
                ...prev,
                blob: new Blob([file], { type: file.type }),
            }));
        }
    };

    const handleSave = async () => {
        const record = {
            id: localPersona.id ?? nanoid(),
            name: localPersona.name,
            description: localPersona.description,
            blob: localPersona.blob,
            createdAt: localPersona.createdAt ?? new Date(),
            updatedAt: new Date(),
        };

        const result = PersonaRecord.safeParse(record);

        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            const errorMessage = Object.values(errors).join(", ");
            toast.error(`Persona validation error: ${errorMessage}`);
            return;
        }

        try {
            await db.personas.put(result.data);
            toast.success("Persona saved successfully!");
            setPersona(result.data);
        } catch (error) {
            console.error("Failed to save persona", error);
            toast.error("Failed to save persona");
        }
    };

    const { browse, input } = useFileDialog({
        accept: ".png, .jpeg, .webp",
        onChange: handleImageUpload,
    });

    return (
        <div className="flex flex-col w-full">
            <Header />
            <div className="flex mx-auto gap-8 w-9/10">
                <div className="flex flex-col gap-4 w-2/5">
                    <Card>
                        <CardContent className="space-y-2">
                            {personas?.map((persona, index) => (
                                <Card
                                    key={persona.id}
                                    className={`py-4 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/50 ${persona.id === localPersona.id ? "ring-2 ring-green-500/50" : ""}`}
                                    onClick={() => setPersona(persona)}
                                >
                                    <CardContent className="flex flex-row gap-2">
                                        <img
                                            src={personaURLs[index]}
                                            className="size-16 rounded-md"
                                        />
                                        <span className="truncate">
                                            {persona.name}
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button className="flex grow cursor-pointer">
                                <Plus />
                                New
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                <Card className="w-4/5">
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex flex-col gap-4">
                                <PersonaImage
                                    imageURL={localImageURL}
                                    onImageClick={browse}
                                />
                                {input}
                            </div>
                            <div className="flex flex-col grow gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={localPersona?.name ?? ""}
                                        onChange={(e) =>
                                            setLocalPersona((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter persona name..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={localPersona?.description ?? ""}
                                        onChange={(e) =>
                                            setLocalPersona((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter persona description..."
                                        className="min-h-[200px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleSave}
                            className="ml-auto cursor-pointer"
                        >
                            <Save />
                            Save
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
