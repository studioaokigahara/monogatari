import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import merge from "lodash.merge";
import React, { createContext, useContext, useEffect, useState } from "react";

interface SettingsContextType {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    updateSettings: (update: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        const settingsString = localStorage.getItem("settings");
        const settingsJSON = settingsString ? JSON.parse(settingsString) : {};
        const parsed: Partial<Settings> = Settings.parse(settingsJSON);
        return merge({}, DEFAULT_SETTINGS, parsed);
    });

    const updateSettings = (update: Partial<Settings>) => {
        setSettings((settings: Settings) => ({ ...settings, ...update }));
    };

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
