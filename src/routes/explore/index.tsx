import { settingsCollection } from "@/hooks/use-settings";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/explore/")({
    beforeLoad: () => {
        const settings = settingsCollection.toArray[0];
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
    }
});
