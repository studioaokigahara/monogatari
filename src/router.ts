import { db } from "@/database/database";
import {
    createRootRouteWithContext,
    createRoute,
    createRouter,
    redirect,
} from "@tanstack/react-router";

import type { CharacterRecord } from "@/database/schema/character";
import Layout from "@/layout";
import CharacterList from "@/pages/characters/list";
import CharacterProfile from "@/pages/characters/profile";
import Chat from "@/pages/chat";
import ExploreLayout from "@/pages/explore/layout";
import ApiSettings from "@/pages/settings/api";
import FormatSettings from "@/pages/settings/format";
import { GeneralSettings } from "@/pages/settings/general";
import SettingsLayout from "@/pages/settings/layout";
import LorebookSettings from "@/pages/settings/lorebook";
import PromptSettings from "@/pages/settings/prompts";
import PersonaEditor from "./pages/persona";

interface Context {
    breadcrumb?: string;
    character?: CharacterRecord;
}

const rootRoute = createRootRouteWithContext<Context>()({
    component: Layout,
    beforeLoad: ({ location }) => {
        if (location.pathname === "/") {
            throw redirect({ to: "/chat" });
        }
        return { breadcrumb: "Home" };
    },
});

export const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "chat",
    component: Chat,
    beforeLoad: () => ({
        breadcrumb: "Chat",
    }),
});

export const characterChatRoute = createRoute({
    getParentRoute: () => chatRoute,
    path: "$id",
    component: Chat,
});

const charactersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "characters",
    beforeLoad: () => ({
        breadcrumb: "Characters",
    }),
});

const characterListRoute = createRoute({
    getParentRoute: () => charactersRoute,
    path: "/",
    component: CharacterList,
    beforeLoad: () => ({
        breadcrumb: null,
    }),
});

export const characterProfileRoute = createRoute({
    getParentRoute: () => charactersRoute,
    path: "$id",
    component: CharacterProfile,
    beforeLoad: async ({ params }) => {
        const { id } = params;

        const character = await db.characters.get(id);

        if (!character) {
            throw new Error("Character not found");
        }

        return { character, breadcrumb: character.data.name ?? id };
    },
});

const exploreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "explore",
    component: ExploreLayout,
    beforeLoad: () => ({
        breadcrumb: "Explore",
    }),
});

const personasRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "personas",
    component: PersonaEditor,
    beforeLoad: () => ({
        breadcrumb: "Personas",
    }),
});

const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "settings",
    component: SettingsLayout,
    beforeLoad: () => ({
        breadcrumb: "Settings",
    }),
});

const generalSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "/",
    component: GeneralSettings,
    beforeLoad: () => ({
        breadcrumb: null!,
    }),
});

const apiSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "api",
    component: ApiSettings,
    beforeLoad: () => ({
        breadcrumb: "API",
    }),
});

const toolSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "tools",
    beforeLoad: () => ({
        breadcrumb: "Tools",
    }),
});

const promptSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "prompts",
    component: PromptSettings,
    beforeLoad: () => ({
        breadcrumb: "Prompts",
    }),
});

const lorebookSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "lorebooks",
    component: LorebookSettings,
    beforeLoad: () => ({
        breadcrumb: "Lorebooks",
    }),
});

const formatSettingsRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "formatting",
    component: FormatSettings,
    beforeLoad: () => ({
        breadcrumb: "Formatting",
    }),
});

const routeTree = rootRoute.addChildren([
    chatRoute.addChildren([characterChatRoute]),
    charactersRoute.addChildren([characterListRoute, characterProfileRoute]),
    exploreRoute,
    personasRoute,
    settingsRoute.addChildren([
        generalSettingsRoute,
        apiSettingsRoute,
        toolSettingsRoute,
        promptSettingsRoute,
        lorebookSettingsRoute,
        formatSettingsRoute,
    ]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
        context: Context;
    }
}
