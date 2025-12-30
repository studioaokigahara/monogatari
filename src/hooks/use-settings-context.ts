import { Settings } from "@/types/settings";
import { createContext, useContext } from "react";

interface SettingsContext {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    updateSettings: (update: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContext | undefined>(undefined);

function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettingsContext must be within a SettingsContext.");
    }
    return context;
}

export { SettingsContext, useSettingsContext };
