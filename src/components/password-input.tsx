import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff, InfoIcon } from "lucide-react";
import React, { useState } from "react";

interface PasswordProps extends React.ComponentProps<"input"> {
    label?: string;
    tooltip?: string;
}

export default function Password({ label, tooltip, ...props }: PasswordProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Field>
            <FieldLabel htmlFor="password">
                {label}
                {tooltip && (
                    <Tooltip>
                        <TooltipTrigger>
                            <InfoIcon className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-lg">{tooltip}</TooltipContent>
                    </Tooltip>
                )}
            </FieldLabel>
            <ButtonGroup>
                <ButtonGroup className="w-full">
                    <Input
                        id="password"
                        placeholder="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        {...props}
                    />
                </ButtonGroup>
                <ButtonGroup>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <Eye /> : <EyeOff />}
                    </Button>
                </ButtonGroup>
            </ButtonGroup>
        </Field>
    );
}
