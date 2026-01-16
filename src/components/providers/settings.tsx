import { SettingsContext } from "@/contexts/settings";
import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import { toMerged } from "es-toolkit";
import React, { useEffect, useState } from "react";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        const settingsString = localStorage.getItem("settings");
        const settingsJSON = settingsString ? JSON.parse(settingsString) : {};
        const parsed: Partial<Settings> = Settings.parse(settingsJSON);
        return toMerged(DEFAULT_SETTINGS, parsed);
    });

    const updateSettings = (update: Partial<Settings>) => {
        setSettings((settings: Settings) => ({ ...settings, ...update }));
    };

    useEffect(() => {
        localStorage.setItem("settings", JSON.stringify(settings));
    }, [settings]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}
