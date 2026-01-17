import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";
import { Anchor, Eye } from "lucide-react";

const ExploreRepos = [
    { value: "chub", icon: <Eye />, label: "Character Hub" },
    { value: "anchorhold", icon: <Anchor />, label: "Anchorhold" }
];

export function SelectExploreRepo() {
    const { settings, updateSettings } = useSettings();

    const changeExploreProvider = (value: string) => {
        updateSettings((settings) => {
            settings.explore.repo = value as "chub" | "anchorhold";
        });
    };

    const selectItems = ExploreRepos.map((provider) => (
        <SelectItem key={provider.value} value={provider.value}>
            {provider.icon}
            {provider.label}
        </SelectItem>
    ));

    return (
        <Select value={settings.explore.repo} onValueChange={changeExploreProvider}>
            <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent>{selectItems}</SelectContent>
        </Select>
    );
}
