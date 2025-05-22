import { ProxySettings } from "@/components/settings/proxy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsContext } from "@/contexts/settings-context";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function GeneralSettings() {
    const { settings, updateSettings } = useSettingsContext();

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))] gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Miscellaneous</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Label htmlFor="chub_api_key">Character Hub API Key</Label>
                    {/* <Input
                        id="chub_api_key"
                        value={settings.chub.apiKey}
                        onChange={(e) =>
                            updateSettings({ chub: { apiKey: e.target.value } })
                        }
                    /> */}
                    {(() => {
                        const [showPassword, setShowPassword] = useState(false);
                        return (
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="API Key"
                                    type={showPassword ? "text" : "password"}
                                    id="chub_api_key"
                                    value={settings.chub.apiKey}
                                    onChange={(e) =>
                                        updateSettings({
                                            chub: { apiKey: e.target.value },
                                        })
                                    }
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? <Eye /> : <EyeOff />}
                                </Button>
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>
        </div>
    );
}
