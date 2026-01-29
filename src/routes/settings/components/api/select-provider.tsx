import {
    Select,
    SelectContent,
    SelectGroup,
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

    const selectItems = ExploreRepos.map((provider) => (
        <SelectItem key={provider.value} value={provider.value}>
            {provider.icon}
            {provider.label}
        </SelectItem>
    ));

    return (
        <Select
            items={ExploreRepos}
            value={settings.explore.repo}
            onValueChange={(value) => {
                updateSettings((settings) => {
                    settings.explore.repo = value as "chub" | "anchorhold";
                });
            }}
        >
            <SelectTrigger>
                <SelectValue placeholder="Select provider...">
                    {(value) => {
                        const item = ExploreRepos.find((item) => item.value === value);
                        return (
                            <span className="flex items-center gap-1.5">
                                {item?.icon}
                                {item?.label}
                            </span>
                        );
                    }}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>{selectItems}</SelectGroup>
            </SelectContent>
        </Select>
    );
}
