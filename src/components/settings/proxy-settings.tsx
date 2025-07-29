import Password from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useSettingsContext } from "@/contexts/settings-context";
import { nanoid } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import React from "react";
import type { ProxyProfile } from "@/types/settings";

export function ProxySettings() {
    const { settings, updateSettings } = useSettingsContext();
    const { profiles, selected } = settings.proxies;
    const provider = settings.provider;

    const addProfile = () => {
        const newProfile = {
            id: nanoid(),
            name: "New proxy",
            baseURL: "",
            password: ""
        };
        updateSettings({
            proxies: {
                profiles: [...profiles, newProfile],
                selected: { ...selected, [provider]: newProfile.id }
            }
        });
    };

    const updateProfile = (id: string, changes: Partial<ProxyProfile>) => {
        updateSettings({
            proxies: {
                profiles: profiles.map((p) =>
                    p.id === id ? { ...p, ...changes } : p
                ),
                selected
            }
        });
    };

    const deleteProfile = (id: string) => {
        const newProfiles = profiles.filter((p) => p.id !== id);
        const { [provider]: removed, ...rest } = selected;
        updateSettings({
            proxies: {
                profiles: newProfiles,
                selected: {
                    ...rest,
                    ...(removed ? { [provider]: "" } : {})
                }
            }
        });
    };

    const selectProfile = (id: string) => {
        updateSettings({
            proxies: {
                profiles,
                selected: { ...selected, [provider]: id }
            }
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Proxy Profiles</CardTitle>
                <Button onClick={addProfile}>
                    <Plus />
                    New Profile
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                <Label>Current Profile</Label>
                <div className="flex justify-between">
                    <Select
                        value={selected[provider]}
                        onValueChange={selectProfile}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a proxy" />
                        </SelectTrigger>
                        <SelectContent>
                            {profiles.map((proxy) => (
                                <SelectItem key={proxy.id} value={proxy.id}>
                                    {proxy.name || proxy.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selected[provider] && (
                        <Button
                            variant="destructive"
                            onClick={() => deleteProfile(selected[provider]!)}
                        >
                            <Trash2 />
                            Delete Profile
                        </Button>
                    )}
                </div>
                {selected[provider] &&
                    profiles
                        .filter((profile) => profile.id === selected[provider])
                        .map((profile) => (
                            <React.Fragment key={profile.id}>
                                <Input
                                    placeholder="Name"
                                    value={profile.name}
                                    onChange={(e) =>
                                        updateProfile(profile.id, {
                                            name: e.target.value
                                        })
                                    }
                                />
                                <Input
                                    placeholder="Base URL"
                                    value={profile.baseURL}
                                    onChange={(e) =>
                                        updateProfile(profile.id, {
                                            baseURL: e.target.value
                                        })
                                    }
                                />
                                <Password
                                    value={profile.password}
                                    onChange={(e) =>
                                        updateProfile(profile.id, {
                                            password: e.target.value
                                        })
                                    }
                                />
                            </React.Fragment>
                        ))}
            </CardContent>
        </Card>
    );
}
