import { SettingsContext } from "@/hooks/use-settings-context";
import { DEFAULT_SETTINGS, Settings } from "@/types/settings";
import merge from "lodash.merge";
import React, { useEffect, useState } from "react";

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
        <SettingsContext value={{ settings, setSettings, updateSettings }}>
            {children}
        </SettingsContext>
    );
}
