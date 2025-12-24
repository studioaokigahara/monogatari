import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Info } from "lucide-react";
import React, { useState } from "react";
import { Label } from "./ui/label";
import { TooltipContent, Tooltip, TooltipTrigger } from "./ui/tooltip";

interface PasswordProps extends React.ComponentProps<"input"> {
    label?: string;
    tooltip?: string;
}

export default function Password({ label, tooltip, ...props }: PasswordProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-1">
            <div className="flex flex-row gap-2">
                {label && <Label>{label}</Label>}
                {tooltip && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-lg">
                            {tooltip}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className="flex flex-row space-x-2">
                <Input
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...props}
                />
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <Eye /> : <EyeOff />}
                </Button>
            </div>
        </div>
    );
}
