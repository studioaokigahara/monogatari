import { useSettingsContext } from "@/hooks/use-settings-context";
import AnchorholdLayout from "@/routes/explore/anchorhold/layout";
import { CharacterArchiveExplorer } from "@/routes/explore/charchive/layout";
import ChubLayout from "@/routes/explore/chub/layout";
import { createFileRoute } from "@tanstack/react-router";

function ExploreLayout() {
    const { settings } = useSettingsContext();

    switch (settings.explore.provider) {
        case "chub":
            return <ChubLayout />;
        case "anchorhold":
            return <AnchorholdLayout />;
        case "charchive":
            return <CharacterArchiveExplorer />;
    }
}

export const Route = createFileRoute("/explore")({
    component: ExploreLayout,
    head: () => ({
        meta: [{ title: "Explore - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Explore"
    })
});
