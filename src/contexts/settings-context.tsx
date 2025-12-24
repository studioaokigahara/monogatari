import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import merge from "lodash.merge";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState
} from "react";

interface SettingsContextType {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    updateSettings: (update: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        const stored = localStorage.getItem("settings");
        const parsed: Partial<Settings> = stored ? JSON.parse(stored) : {};
        return merge({}, DEFAULT_SETTINGS, parsed);
    });

    const updateSettings = useCallback(
        (update: Partial<Settings>) => {
            setSettings((settings: Settings) => ({ ...settings, ...update }));
        },
        [setSettings]
    );

    useEffect(() => {
        localStorage.setItem("settings", JSON.stringify(settings));
    }, [settings]);

    return (
        <SettingsContext.Provider
            value={{ settings, setSettings, updateSettings }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be within SettingsProvider.");
    }
    return context;
}
