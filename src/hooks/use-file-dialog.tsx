import { Input } from "@/components/ui/input";
import { ReactNode, useRef } from "react";

export interface UseFileDialogOptions {
    /** file types to accept, e.g. ".png,.jpg" */
    accept?: string;
    /** allow selecting multiple files */
    multiple?: boolean;
    /** callback when files are selected */
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface UseFileDialogReturn {
    browse: () => void;
    input: ReactNode;
}

export function useFileDialog({
    accept,
    multiple,
    onChange,
}: UseFileDialogOptions): UseFileDialogReturn {
    const inputRef = useRef<HTMLInputElement>(null);

    const browse = () => {
        inputRef.current?.click();
    };

    const input = (
        <Input
            type="file"
            ref={inputRef}
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            className="hidden"
        />
    );

    return { browse, input };
}
