import { Field, FieldLabel } from "@/components/ui/field";
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

const EXPLORE_REPOS = [
    { value: "chub", icon: <Eye />, label: "Character Hub" },
    { value: "anchorhold", icon: <Anchor />, label: "Anchorhold" }
];

export function SelectExploreRepo() {
    const { settings, updateSettings } = useSettings();

    const selectItems = EXPLORE_REPOS.map((provider) => (
        <SelectItem key={provider.value} value={provider}>
            {provider.icon}
            {provider.label}
        </SelectItem>
    ));

    return (
        <Field>
            <FieldLabel htmlFor="selectExplore">Default Character Repo</FieldLabel>
            <Select
                id="selectExplore"
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
                            const item = EXPLORE_REPOS.find((item) => item.value === value);
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
        </Field>
    );
}
