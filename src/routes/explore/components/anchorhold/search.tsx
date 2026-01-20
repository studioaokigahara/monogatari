import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { debounce } from "es-toolkit";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

export function AnchorholdSearch() {
    const { search } = useSearch({ from: "/explore/anchorhold" });
    const navigate = useNavigate({ from: "/explore/anchorhold" });

    const [input, setInput] = useState(search);

    const debouncedSearch = debounce((value: string) => {
        void navigate({
            search: () => ({ search: value })
        });
    }, 250);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setInput(value);
        debouncedSearch(value);
    };

    return (
        <Card className="w-full border-none bg-transparent py-4 shadow-none">
            <CardContent>
                <ButtonGroup className="w-full">
                    <ButtonGroup className="grow">
                        <InputGroup>
                            <InputGroupInput
                                placeholder="Search..."
                                value={input}
                                onChange={handleChange}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                    </ButtonGroup>
                </ButtonGroup>
            </CardContent>
        </Card>
    );
}
