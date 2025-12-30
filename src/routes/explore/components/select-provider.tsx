import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useSettingsContext } from "@/hooks/use-settings-context";
import { Anchor, Eye, ShieldUser } from "lucide-react";

const ExploreProviders = [
    { value: "chub", icon: <Eye />, label: "Character Hub" },
    { value: "anchorhold", icon: <Anchor />, label: "Anchorhold" },
    { value: "charchive", icon: <ShieldUser />, label: "Character Archive" }
];

export function SelectExploreProvider() {
    const { settings, updateSettings } = useSettingsContext();

    const changeExploreProvider = (value: string) => {
        updateSettings({
            explore: {
                ...settings.explore,
                provider: value as "chub" | "anchorhold" | "charchive"
            }
        });
    };

    const selectItems = ExploreProviders.map((provider) => (
        <SelectItem key={provider.value} value={provider.value}>
            {provider.icon}
            {provider.label}
        </SelectItem>
    ));

    return (
        <Select
            value={settings.explore.provider}
            onValueChange={changeExploreProvider}
        >
            <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent>{selectItems}</SelectContent>
        </Select>
    );
}
