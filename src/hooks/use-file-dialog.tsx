import { Input } from "@/components/ui/input";
import { ReactNode, useRef } from "react";

export interface UseFileDialogOptions {
    /** File types to accept, e.g. ".png, .jpeg" or "image/*" */
    accept?: string;
    /** Allow selecting multiple files */
    multiple?: boolean;
    /** Callback when files are selected */
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface UseFileDialogReturn {
    browse: () => void;
    input: ReactNode;
}

export function useFileDialog({
    accept,
    multiple,
    onChange
}: UseFileDialogOptions): UseFileDialogReturn {
    const inputRef = useRef<HTMLInputElement>(null);

    const browse = () => {
        inputRef.current?.click();
    };

    const onClick = (event: React.MouseEvent) => {
        (event.target as HTMLInputElement).value = "";
    };

    const input = (
        <Input
            type="file"
            ref={inputRef}
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            onClick={onClick}
            className="hidden"
        />
    );

    return { browse, input };
}
