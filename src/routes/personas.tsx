import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { useCharacterContext } from "@/contexts/character";
import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import { Persona } from "@/database/schema/persona";
import { useAppForm } from "@/hooks/use-app-form";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Upload, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PersonaEditorProps {
    persona: Persona;
}

function PersonaEditor({ persona }: PersonaEditorProps) {
    const form = useAppForm({
        defaultValues: persona,
        validators: {
            onMount: ({ value }) => persona.validate(value),
            onChange: ({ value }) => persona.validate(value)
        },
        onSubmit: async ({ value }) => {
            try {
                await persona.update(value);
            } catch (error) {
                toast.error("Failed to update persona", {
                    description: error instanceof Error ? error.message : ""
                });
            }
        },
        listeners: {
            onChangeDebounceMs: 500,
            onChange: ({ formApi: form }) => {
                if (form.state.isValid && !form.state.isSubmitting) {
                    void form.handleSubmit();
                }
            }
        }
    });

    useEffect(() => form.reset(persona), [form, persona]);

    const imageURL = useImageURL({
        category: "persona",
        id: persona.id
    });

    const { browse, input } = useFileDialog({
        accept: "image/*",
        multiple: false,
        onChange: async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                const asset = await Asset.loadPersonaAsset(persona.id);
                await asset.update({ file });
            }
        }
    });

    return (
        <form
            className="flex grow flex-col gap-6 overflow-auto pb-2 sm:flex-row"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <Avatar className="size-[unset] h-64 cursor-pointer rounded-xl transition-all after:rounded-xl hover:brightness-90">
                {input}
                <AvatarImage
                    src={imageURL}
                    className="aspect-[unset] w-full cursor-pointer rounded-xl object-cover"
                    onClick={browse}
                />
                <AvatarFallback className="rounded-xl">
                    <Button
                        variant="outline"
                        onClick={browse}
                        className="flex aspect-2/3 h-64 items-center justify-center gap-2"
                    >
                        <Upload />
                        No Image
                    </Button>
                </AvatarFallback>
            </Avatar>
            <FieldGroup>
                <form.AppField name="name">
                    {(field) => <field.InputField type="text" label="Name" />}
                </form.AppField>
                <form.AppField name="description">
                    {(field) => <field.TextareaField label="Description" />}
                </form.AppField>
            </FieldGroup>
        </form>
    );
}

function Personas() {
    const { persona, setPersona } = useCharacterContext();
    const [localPersona, setLocalPersona] = useState<Persona | undefined>(persona);

    useEffect(() => {
        setLocalPersona(persona!);
    }, [persona]);

    const preload = useLoaderData({ from: "__root__" });
    const personas = useLiveQuery(() => db.personas.toArray(), [], preload);

    const personaImages = useImageURL(
        personas.map((persona) => ({
            category: "persona" as const,
            id: persona.id
        }))
    );

    const newPersona = async () => {
        try {
            const persona = new Persona();
            await persona.save();
            setPersona(persona);
            toast.success("Persona created successfully!");
        } catch (error) {
            console.error("Failed to create persona:", error);
            toast.error("Failed to create persona", {
                description: error instanceof Error ? error.message : ""
            });
        }
    };

    const deletePersona = async (persona: Persona) => {
        try {
            await persona.delete();
            toast.success("Persona deleted.");
        } catch (error) {
            console.error("Failed to delete persona:", error);
            toast.error("Failed to delete persona", {
                description: error instanceof Error ? error.message : ""
            });
        }
    };

    const personaItems = personas.map((persona, index) => (
        <SidebarMenuItem key={persona.id} onClick={() => setPersona(persona)}>
            <SidebarMenuButton isActive={persona.id === localPersona?.id}>
                <Avatar>
                    <AvatarImage src={personaImages?.[index]} className="object-cover" />
                    <AvatarFallback>{persona.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{persona.name}</span>
            </SidebarMenuButton>
            <SidebarMenuAction className="text-destructive" onClick={() => deletePersona(persona)}>
                <Trash2 />
                <span className="sr-only">Delete Persona</span>
            </SidebarMenuAction>
        </SidebarMenuItem>
    ));

    return (
        <>
            <Header />
            <div className="h-full pb-2 sm:overflow-hidden">
                <Card className="overflow-hidden sm:h-full">
                    <CardContent className="flex flex-col sm:flex-row sm:overflow-hidden">
                        <SidebarProvider className="min-h-0 gap-4 max-sm:flex-col">
                            <Sidebar collapsible="none" className="w-full sm:w-(--sidebar-width)">
                                <SidebarHeader>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton onClick={newPersona}>
                                                <UserPlus />
                                                New Persona
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarHeader>
                                <SidebarSeparator className="mx-0" />
                                <SidebarContent>
                                    <SidebarGroup>
                                        <SidebarGroupContent>
                                            <SidebarMenu>{personaItems}</SidebarMenu>
                                        </SidebarGroupContent>
                                    </SidebarGroup>
                                </SidebarContent>
                            </Sidebar>
                            {localPersona && <PersonaEditor persona={localPersona} />}
                        </SidebarProvider>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export const Route = createFileRoute("/personas")({
    component: Personas,
    head: () => ({
        meta: [{ title: "Personas - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Personas"
    })
});
