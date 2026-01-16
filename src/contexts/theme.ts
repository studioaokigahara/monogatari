import { initialState, ThemeContextState } from "@/types/theme";
import { createContext, useContext } from "react";

export const ThemeContext = createContext<ThemeContextState>(initialState);

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useThemeContext must be used within a ThemeContext.Provider.");
    }
    return context;
}
