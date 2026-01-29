import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Character } from "@/database/schema/character";
import { getCroppedImage, saveCroppedImage } from "@/lib/character/image";
import { getFileExtension } from "@/lib/utils";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import Cropper, { Area } from "react-easy-crop";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    character: Character;
    image: File;
    imageURL: string;
}

export function AvatarCropper({ open, onOpenChange, image, imageURL, character }: Props) {
    const [step, setStep] = useState<"portrait" | "avatar">("portrait");
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const aspectRatio = step === "portrait" ? 2 / 3 : 1;
    const ext = getFileExtension(image.name);

    const handleCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleClick = async () => {
        if (!croppedAreaPixels) return;

        const blob = await getCroppedImage(imageURL, image.type, croppedAreaPixels);
        if (!blob) return;

        await saveCroppedImage(character, step, ext, blob);

        if (step === "portrait") {
            setStep("avatar");
        } else {
            onOpenChange(false);
            setStep("portrait");
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        }

        setCroppedAreaPixels(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full data-open:zoom-in-100 sm:max-w-[80dvw]">
                <DialogHeader className="sr-only">
                    <DialogTitle>Avatar Cropper</DialogTitle>
                    <DialogDescription>
                        Crop a portrait and avatar from the main image
                    </DialogDescription>
                </DialogHeader>
                <div className="relative h-[80dvh] w-full">
                    <Cropper
                        image={imageURL}
                        crop={crop}
                        onCropChange={setCrop}
                        onCropComplete={handleCropComplete}
                        zoom={zoom}
                        maxZoom={Infinity}
                        onZoomChange={setZoom}
                        aspect={aspectRatio}
                        cropShape={aspectRatio === 1 ? "round" : "rect"}
                    />
                </div>
                <DialogFooter>
                    <Button onClick={() => setStep("avatar")} disabled={step === "avatar"}>
                        Skip
                    </Button>
                    <Button onClick={handleClick} disabled={!croppedAreaPixels}>
                        <ImagePlus />
                        {step === "portrait" ? "Save Portrait" : "Save Avatar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
