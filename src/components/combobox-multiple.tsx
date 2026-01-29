import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor
} from "@/components/ui/combobox";

interface Item {
    value: string;
    label: string;
}

interface Props extends React.ComponentProps<typeof Combobox> {
    items: Item[];
    placeholder?: string;
    value: string[];
    onValueChange: (value: unknown) => void;
    onBlur?: () => void;
}

export function ComboboxMultiple({
    items,
    placeholder,
    value,
    onValueChange,
    onBlur,
    ...props
}: Props) {
    const anchor = useComboboxAnchor();
    const selectedItems = items.filter((item) => value.includes(item.value));
    const handleValueChange = (items: unknown) => {
        onValueChange((items as Item[]).map((item) => item.value));
    };

    return (
        <Combobox
            multiple
            autoHighlight
            items={items}
            isItemEqualToValue={(item, selected) => {
                return (item as Item).value === (selected as Item).value;
            }}
            value={selectedItems}
            onValueChange={handleValueChange}
            {...props}
        >
            <ComboboxChips ref={anchor}>
                <ComboboxValue>
                    {(items: Item[]) => (
                        <>
                            {items.map((item) => (
                                <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder={placeholder} onBlur={onBlur} />
                        </>
                    )}
                </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
                    {(item: Item) => (
                        <ComboboxItem key={item.value} value={item}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
