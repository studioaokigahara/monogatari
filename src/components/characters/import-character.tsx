import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleFileChange } from "@/lib/character/utils";
import { Import } from "lucide-react";
import { useRef } from "react";

export default function ImportCharacter() {
    const inputFile = useRef<HTMLInputElement>(null);

    const onImportClick = () => {
        inputFile.current?.click();
    };

    return (
        <Button onClick={onImportClick}>
            <Input
                className="hidden"
                ref={inputFile}
                type="file"
                accept=".png, .charx, .json"
                onChange={handleFileChange}
            />
            <Import />
            Import
        </Button>
    );
}
