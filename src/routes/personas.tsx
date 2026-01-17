import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useCharacterContext } from "@/contexts/character";
import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import { Persona } from "@/database/schema/persona";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Upload, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PersonaEditorProps {
    persona: Persona;
}

function PersonaEditor({ persona }: PersonaEditorProps) {
    const form = useForm({
        defaultValues: persona,
        validators: {
            onMount: ({ value }) => persona.validate(value),
            onChange: ({ value }) => persona.validate(value),
            onSubmit: ({ value }) => persona.validate(value)
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
                    form.handleSubmit();
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
                if (asset) await asset.update({ file });
            }
        }
    });

    return (
        <form
            className="flex grow gap-4 overflow-auto pb-2"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <FieldGroup className="flex flex-col gap-6 sm:flex-row">
                <Avatar className="size-[unset] h-64 rounded-xl">
                    {input}
                    <AvatarImage
                        src={imageURL}
                        className="aspect-[unset] w-full cursor-pointer object-cover transition-all hover:brightness-75"
                        onClick={browse}
                    />
                    <AvatarFallback className="rounded-xl">
                        <Button
                            onClick={browse}
                            className="flex h-24 w-48 cursor-pointer items-center justify-center gap-2"
                        >
                            <Upload />
                            No Image
                        </Button>
                    </AvatarFallback>
                </Avatar>
                <FieldGroup className="flex flex-col *:gap-1">
                    <form.Field name="name">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={invalid}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => {
                            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={invalid}
                                    />
                                    {invalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
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
