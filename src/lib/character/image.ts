import { Asset } from "@/database/schema/asset";
import { Character, CharacterCardV3Asset } from "@/database/schema/character";
import { Area } from "react-easy-crop";
import { toast } from "sonner";

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = url;
        image.onload = () => resolve(image);
        image.onerror = (error) => reject(error);
    });
}

function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
    const angle = getRadianAngle(rotation);

    return {
        width: Math.abs(Math.cos(angle) * width) + Math.abs(Math.sin(angle) * height),
        height: Math.abs(Math.sin(angle) * width) + Math.abs(Math.cos(angle) * height)
    };
}

export async function getCroppedImage(
    imageURL: string,
    fileType: string,
    cropArea: Area,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
) {
    const image = await createImage(imageURL);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    const rotRad = getRadianAngle(rotation);

    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;
    context.translate(bBoxWidth / 2, bBoxHeight / 2);
    context.rotate(rotRad);
    context.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    context.translate(-image.width / 2, -image.height / 2);
    context.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement("canvas");
    const croppedContext = croppedCanvas.getContext("2d");
    if (!croppedContext) return null;

    croppedCanvas.width = cropArea.width;
    croppedCanvas.height = cropArea.height;

    croppedContext.drawImage(
        canvas,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
    );

    const blobPromise = new Promise<Blob>((resolve, reject) => {
        croppedCanvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("toBlob returned null"));
            } else {
                resolve(blob);
            }
        }, fileType);
    });

    toast.promise(blobPromise, {
        loading: "Cropping image",
        success: "Cropped image successfully",
        error: (error) => ({
            message: "Failed to crop image",
            description: error.message
        })
    });

    return await blobPromise;
}

export async function saveCroppedImage(
    character: Character,
    name: string,
    ext: string,
    blob: Blob
) {
    const filename = `${name}.${ext}`;
    const file = new File([blob], filename, { type: blob.type });
    const pointer: CharacterCardV3Asset = { type: "icon", uri: "ccdefault:", name, ext };

    const existingAsset = character.data.assets.find((asset) => asset.name === name);

    if (existingAsset) {
        const asset = await Asset.load(character.id, `${existingAsset.name}.${existingAsset.ext}`);
        await asset.update({ file });
        const index = character.data.assets.indexOf(existingAsset);
        await character.update({ assets: character.data.assets.toSpliced(index, 1, pointer) });
    } else {
        const asset = new Asset({ category: "character", parentID: character.id, file });
        await asset.save();
        await character.update({ assets: [...character.data.assets, pointer] });
    }
}
