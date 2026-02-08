import { ComboboxMultiple } from "@/components/combobox-multiple";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFieldContext } from "@/contexts/form";
import { HTMLInputTypeAttribute, JSX } from "react";

interface Item {
    value: string;
    label: string;
    icon?: JSX.Element;
}

interface InputFieldProps extends React.ComponentProps<typeof Input> {
    type: HTMLInputTypeAttribute | "array";
    label: string;
}

export function InputField({ type, label, disabled, className }: InputFieldProps) {
    const field = useFieldContext<string | string[] | number>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const value =
        type === "array"
            ? field.state.value
                ? (field.state.value as string[]).join(", ")
                : ""
            : field.state.value;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        switch (type) {
            case "array":
                return field.handleChange(event.target.value.split(", "));
            case "number":
                return field.handleChange(Number(event.target.value));
            case "text":
            default:
                return field.handleChange(event.target.value);
        }
    };

    return (
        <Field data-invalid={invalid} className={className}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Input
                id={field.name}
                name={field.name}
                value={value}
                onBlur={field.handleBlur}
                onChange={handleChange}
                type={type}
                aria-invalid={invalid}
                disabled={disabled}
            />
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}

interface TextareaFieldProps extends React.ComponentProps<typeof Textarea> {
    label?: string;
}

export function TextareaField({ label, placeholder, className }: TextareaFieldProps) {
    const field = useFieldContext<string>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={invalid}>
            {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
            <Textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={invalid}
                placeholder={placeholder}
                className={className}
            />
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}

interface SwitchFieldProps {
    type: "boolean" | "number";
    label: string;
    className?: string;
    labelClassName?: string;
}

export function SwitchField({ type, label, className, labelClassName }: SwitchFieldProps) {
    const field = useFieldContext<boolean | number>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const handleCheckedChange = (checked: boolean) => {
        switch (type) {
            case "number":
                return field.handleChange(checked ? 1 : 0);
            case "boolean":
            default:
                return field.handleChange(checked);
        }
    };

    return (
        <Field data-invalid={invalid} className={className}>
            <FieldLabel htmlFor={field.name} className={labelClassName}>
                {label}
                <Switch
                    id={field.name}
                    name={field.name}
                    checked={Boolean(field.state.value)}
                    onCheckedChange={handleCheckedChange}
                    aria-invalid={invalid}
                />
            </FieldLabel>
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}

interface ComboboxFieldProps {
    items: Item[];
    label: string;
    placeholder?: string;
    className?: string;
}

export function ComboboxField({ items, label, placeholder, className }: ComboboxFieldProps) {
    const field = useFieldContext<string[]>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={invalid} className={className}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <ComboboxMultiple
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onValueChange={field.handleChange as (value: unknown) => void}
                placeholder={placeholder}
                items={items}
                aria-invalid={invalid}
            />
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}

interface SelectFieldProps {
    items: Item[];
    label: string;
    placeholder: string;
}

export function SelectField({ items, label, placeholder }: SelectFieldProps) {
    const field = useFieldContext<string>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const selectItems = items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
            {item?.icon}
            {item.label}
        </SelectItem>
    ));

    return (
        <Field data-invalid={invalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Select
                id={field.name}
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as string)}
            >
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} aria-invalid={invalid}>
                        {(value) => {
                            const item = items.find((item) => item.value === value);
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
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}

interface MarkdownEditorFieldProps {
    label?: string;
    placeholder?: string;
}

export function MarkdownEditorField({ label, placeholder }: MarkdownEditorFieldProps) {
    const field = useFieldContext<string>();
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field>
            {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
            <MarkdownEditor
                id={field.name}
                value={field.state.value}
                placeholder={placeholder}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
            />
            {invalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}
