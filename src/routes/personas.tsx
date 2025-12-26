import Header from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from "@/components/ui/field";
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
import { useCharacterContext } from "@/contexts/character-context";
import { db } from "@/database/monogatari-db";
import { Asset } from "@/database/schema/asset";
import { Persona } from "@/database/schema/persona";
import useAutosave from "@/hooks/use-autosave";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { useImageURL } from "@/hooks/use-image-url";
import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Upload, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
            await persona.update(value).catch((error: Error) =>
                toast.error("Failed to update persona", {
                    description: error.message
                })
            );
        }
    });

    useEffect(() => form.reset(persona), [form, persona]);

    const [isDirty, isValid, isSubmitting, values] = useStore(
        form.store,
        (state) => [
            state.isDirty,
            state.isValid,
            state.isSubmitting,
            state.values
        ]
    );

    const handleSubmit = useCallback(() => form.handleSubmit(), [form]);

    useAutosave({
        isDirty,
        isValid,
        isSubmitting,
        values,
        handleSubmit
    });

    const imageURL = useImageURL({
        category: "persona",
        id: persona.id
    });

    const handleImageUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            const asset = await Asset.loadPersonaAsset(persona.id);
            if (asset) asset.update({ file });
        }
    };

    const { browse, input } = useFileDialog({
        accept: "image/*",
        onChange: handleImageUpload
    });

    return (
        <form
            className="flex flex-col grow pb-2 gap-4 overflow-auto"
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldGroup className="flex flex-row gap-6">
                <div className="flex flex-col shrink-0">
                    <Avatar className="size-[unset] h-64 rounded-xl">
                        <AvatarImage
                            src={imageURL}
                            className="w-full aspect-[unset] object-cover cursor-pointer transition-all hover:brightness-75"
                            onClick={browse}
                        />
                        <AvatarFallback className="rounded-xl">
                            <div
                                onClick={browse}
                                className="w-48 h-24 flex items-center justify-center cursor-pointer gap-2"
                            >
                                <Upload />
                                No Image
                            </div>
                        </AvatarFallback>
                    </Avatar>
                    {input}
                </div>
                <FieldGroup className="flex flex-col *:gap-1">
                    <form.Field name="name">
                        {(field) => {
                            const invalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Name
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={invalid}
                                    />
                                    {invalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => {
                            const invalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                            return (
                                <Field data-invalid={invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={invalid}
                                    />
                                    {invalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
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
    const [localPersona, setLocalPersona] = useState<Persona | undefined>(
        persona
    );

    useEffect(() => {
        setLocalPersona(persona!);
    }, [persona]);

    const preload = useLoaderData({ from: "/personas" });
    const personas = useLiveQuery(() => db.personas.toArray(), [], preload);

    const personaImages = useImageURL(
        personas.map((persona) => ({
            category: "persona" as const,
            id: persona.id
        }))
    );

    const newPersona = async () => {
        const persona = new Persona();
        await persona.save().catch((error: Error) => {
            console.error("Failed to create persona", error);
            toast.error("Failed to create persona", {
                description: error.message
            });
        });
        setPersona(persona);
        toast.success("Persona created successfully!");
    };

    const deletePersona = async (persona: Persona) => {
        await persona.delete().catch((error: Error) => {
            console.error("Failed to delete persona:", error);
            toast.error("Failed to delete persona", {
                description: error.message
            });
        });
        toast.success("Persona deleted.");
    };

    const personaItems = personas.map((persona, index) => (
        <SidebarMenuItem
            key={persona.id}
            // className={cn(
            //     "py-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/50",
            //     persona.id ===
            //         localPersona.id
            //         ? "ring-2 ring-green-500/50"
            //         : ""
            // )}
            onClick={() => setPersona(persona)}
        >
            <SidebarMenuButton isActive={persona.id === localPersona?.id}>
                <Avatar>
                    <AvatarImage
                        src={personaImages?.[index]}
                        className="object-cover"
                    />
                    <AvatarFallback>{persona.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{persona.name}</span>
            </SidebarMenuButton>
            <SidebarMenuAction
                className="text-destructive"
                onClick={() => deletePersona(persona)}
            >
                <Trash2 />
                <span className="sr-only">Delete Persona</span>
            </SidebarMenuAction>
        </SidebarMenuItem>
    ));

    return (
        <>
            <Header />
            <div className="flex flex-col grow pb-2 gap-4 overflow-hidden">
                <Card className="overflow-hidden">
                    <CardContent className="space-y-2">
                        <SidebarProvider className="gap-6">
                            <Sidebar collapsible="none">
                                <SidebarHeader>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={newPersona}
                                            >
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
                                            <SidebarMenu>
                                                {personaItems}
                                            </SidebarMenu>
                                        </SidebarGroupContent>
                                    </SidebarGroup>
                                </SidebarContent>
                            </Sidebar>
                            {localPersona && (
                                <PersonaEditor persona={localPersona} />
                            )}
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
    }),
    loader: () => db.personas.toArray()
});
