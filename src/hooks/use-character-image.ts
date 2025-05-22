import { fetchCharacterImage } from "@/lib/chub/api";
import type { Character } from "@/types/chub";
import { useEffect, useState } from "react";

export function useCharacterImage(character: Character): Blob | null {
    const [image, setImage] = useState<Blob | null>(null);

    useEffect(() => {
        if (!character) {
            setImage(null);
            return;
        }

        const fetch = async () => {
            const blob = await fetchCharacterImage(character);
            setImage(blob);
        };
        fetch();

        return () => {
            setImage(null);
        };
    }, [character]);

    return image;
}
