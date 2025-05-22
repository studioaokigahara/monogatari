import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { Label } from "./ui/label";

interface PasswordProps extends React.ComponentProps<"input"> {
    label?: string;
}

export default function Password({ label, ...props }: PasswordProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={"flex flex-col space-y-2"}>
            {label && <Label>{label}</Label>}
            <div className="flex flex-row space-x-2">
                <Input
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
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
