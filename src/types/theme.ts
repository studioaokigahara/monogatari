export type Theme = "dark" | "light" | "system";

export interface ThemeContextState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const initialState: ThemeContextState = {
    theme: "system",
    setTheme: () => null
};
