import { db } from "@/database/database";
import type { CharacterRecord } from "@/database/schema/character";
import { PersonaRecord } from "@/database/schema/persona";
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import { useImageContext } from "./image-context";
import { useSettingsContext } from "./settings-context";
import { defaultUrlTransform } from "react-markdown";

interface CharacterContextType {
    character?: CharacterRecord;
    setCharacter: (rec?: CharacterRecord) => void;
    clearCharacter: () => void;
    persona?: PersonaRecord;
    setPersona: (rec?: PersonaRecord) => void;
    clearPersona: () => void;
    clearAll: () => void;
    urlTransform: (url: string) => string;
}

const CharacterContext = createContext<CharacterContextType | undefined>(
    undefined
);

export function CharacterProvider({ children }: { children: ReactNode }) {
    const { settings, updateSettings } = useSettingsContext();
    const { getURL } = useImageContext();
    const [character, setCharacter] = useState<CharacterRecord | undefined>(
        undefined
    );
    const [persona, setPersona] = useState<PersonaRecord | undefined>(
        undefined
    );

    const clearCharacter = () => setCharacter(undefined);
    const clearPersona = () => setPersona(undefined);
    const clearAll = () => {
        clearCharacter();
        clearPersona();
    };

    useEffect(() => {
        const fetch = async () => {
            const def = await db.personas.get(settings.persona);
            setPersona(def);
        };
        fetch();
    }, []);

    useEffect(() => {
        updateSettings({ persona: persona?.id });
    }, [persona?.id]);

    const urlMap = useMemo(() => {
        const map = new Map<string, string>();
        const assets = character?.assets
            ? character.assets.map((asset) => asset)
            : [];
        for (const asset of assets) {
            const key = `${asset.name}.${asset.ext}`;
            const url = getURL(asset.blob);
            map.set(key, url);
        }
        return map;
    }, [character]);

    const urlTransform = useCallback(
        (url: string) => {
            if (url.startsWith("embedded://")) {
                const key = url.replace("embedded://", "");
                return urlMap.get(key) || "";
            }
            return defaultUrlTransform(url);
        },
        [urlMap]
    );

    return (
        <CharacterContext.Provider
            value={{
                character,
                setCharacter,
                clearCharacter,
                persona,
                setPersona,
                clearPersona,
                clearAll,
                urlTransform
            }}
        >
            {children}
        </CharacterContext.Provider>
    );
}

export function useCharacterContext(): CharacterContextType {
    const ctx = useContext(CharacterContext);
    if (!ctx)
        throw new Error(
            "useCharacterContext must be used inside CharacterProvider"
        );
    return ctx;
}
