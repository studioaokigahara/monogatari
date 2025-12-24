import { CharacterCardV3Asset } from "@/database/schema/character";

type ImageRequest =
    | { category: "persona"; id: string }
    | {
          category: "character";
          id: string;
          assets: CharacterCardV3Asset[];
          fileName?: string;
      };

export function useImageURL(request: ImageRequest): string;
export function useImageURL(request: ImageRequest[]): string[];
export function useImageURL(request: ImageRequest | undefined): string;
export function useImageURL(
    request: ImageRequest[] | undefined
): string | string[];

export function useImageURL(
    request: ImageRequest | ImageRequest[] | undefined
) {
    const requests = Array.isArray(request) ? request : [request];

    const imageURLs = requests.map((request) => {
        if (!request) return "";

        if (request.category === "persona") {
            return `/images/personas/${request.id}.png`;
        }

        const assets = request.assets;
        let fileName = request.fileName;

        if (!fileName) {
            const asset =
                assets.find((asset) => asset.type === "icon") ?? assets[0];
            if (asset) fileName = `${asset.name}.${asset.ext}`;
        }

        return `/images/characters/${request.id}/${fileName}`;
    });

    return Array.isArray(request) ? imageURLs : imageURLs[0];
}
