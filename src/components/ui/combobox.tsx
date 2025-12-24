import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "./badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "./command";
import { cn } from "@/lib/utils";

interface ComboboxProps {
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    onBlur?: () => void;
}

interface SingleCombobox extends ComboboxProps {
    variant?: "single";
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
}

interface MultipleCombobox extends ComboboxProps {
    variant?: "multiple";
    value?: string[];
    defaultValue?: string[];
    onChange?: (value: string[]) => void;
}

type Props = SingleCombobox | MultipleCombobox;

export function Combobox({
    variant = "single",
    options,
    placeholder = "Select...",
    disabled: _disabled,
    id,
    name: _name,
    onBlur: _onBlur,
    value: controlledValue,
    defaultValue,
    onChange
}: Props) {
    const [open, setOpen] = useState(false);

    const fallbackValue = defaultValue ?? (variant === "single" ? "" : []);

    const [uncontrolledValue, setUncontrolledValue] = useState(fallbackValue);

    const isControlled = controlledValue !== undefined;
    const value = (
        isControlled ? controlledValue : uncontrolledValue
    ) as Props["value"];

    const updateValue = (next: Props["value"]) => {
        if (!next) return;
        if (!isControlled) setUncontrolledValue(next);
        // @ts-expect-error ts wants string & string[] instead of string | string[]
        onChange?.(next);
    };

    const selectValue = (selectedValue: string) => {
        if (variant === "multiple") {
            const current = Array.isArray(value) ? value : [];
            const next = current.includes(selectedValue)
                ? current.filter((value) => value !== selectedValue)
                : [...current, selectedValue];
            updateValue(next);
        } else {
            const next = value === selectedValue ? "" : selectedValue;
            updateValue(next);
            setOpen(false);
        }
    };

    const hasValue = (selectedValue: string) => {
        return Array.isArray(value)
            ? value.includes(selectedValue)
            : value === selectedValue;
    };

    const renderValue = () => {
        if (variant === "multiple") {
            if (!Array.isArray(value) || value.length === 0) return placeholder;

            return (
                <>
                    {value.map((entry) => {
                        const label =
                            options.find((option) => option.value === entry)
                                ?.label ?? entry;
                        return (
                            <Badge key={entry}>
                                {label}
                                <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="size-min"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectValue(entry);
                                    }}
                                >
                                    <X />
                                </Button>
                            </Badge>
                        );
                    })}
                </>
            );
        } else if (typeof value === "string" && value) {
            return (
                options.find((option) => option.value === value)?.label ?? value
            );
        }

        return placeholder;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="justify-between"
                >
                    <div className="flex gap-1">{renderValue()}</div>
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    keywords={[option.label]}
                                    onSelect={() => selectValue(option.value)}
                                >
                                    {option.label}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            hasValue(option.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
