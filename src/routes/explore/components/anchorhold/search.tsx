import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";

interface Props {
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function AnchorholdSearch({ onChange: handleChange }: Props) {
    return (
        <Card className="w-full py-4 bg-transparent border-none shadow-none">
            <CardContent>
                <ButtonGroup className="w-full">
                    <ButtonGroup className="grow">
                        <InputGroup>
                            <InputGroupInput placeholder="Search..." onChange={handleChange} />
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
