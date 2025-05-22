import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import merge from "lodash.merge";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
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
        [setSettings],
    );

    useEffect(() => {
        localStorage.setItem("settings", JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: "SETTINGS",
                settings,
            });
        } else {
            navigator.serviceWorker.ready.then((reg) => {
                reg.active?.postMessage({ type: "SETTINGS", settings });
            });
        }
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
    const ctx = useContext(SettingsContext);
    if (!ctx) {
        throw new Error("useSettings must be under SettingsProvider");
    }
    return ctx;
}
