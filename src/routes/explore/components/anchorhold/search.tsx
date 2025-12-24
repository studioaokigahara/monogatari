import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { SelectExploreProvider } from "../select-provider";

interface Props {
    updateSearch: (query: string) => void;
}

export function AnchorholdSearch({ updateSearch }: Props) {
    return (
        <Card className="w-full py-4 bg-transparent border-none shadow-none">
            <CardContent>
                <ButtonGroup className="w-full">
                    <ButtonGroup className="grow">
                        <SelectExploreProvider />
                        <InputGroup>
                            <InputGroupInput
                                placeholder="Search..."
                                onChange={(e) => updateSearch(e.target.value)}
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
