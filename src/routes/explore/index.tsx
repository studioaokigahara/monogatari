import { Settings } from "@/types/settings";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/explore/")({
    beforeLoad: () => {
        const settingsItem = localStorage.getItem("settings");
        if (settingsItem) {
            const settings: Settings = JSON.parse(settingsItem);
            switch (settings.explore.repo) {
                case "anchorhold":
                    throw redirect({
                        to: "/explore/anchorhold"
                    });
                case "chub":
                default:
                    throw redirect({
                        to: "/explore/chub"
                    });
            }
        } else {
            throw redirect({
                to: "/explore/chub"
            });
        }
    }
});
