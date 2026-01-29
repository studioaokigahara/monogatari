import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/database/monogatari-db";
import { Lorebook } from "@/database/schema/lorebook";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { LorebookEditor } from "@/routes/settings/components/lorebooks/editor";
import { LorebookList } from "@/routes/settings/components/lorebooks/list";
import {
    createFileRoute,
    stripSearchParams,
    useLoaderData,
    useNavigate,
    useSearch
} from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { BookDashedIcon, BookDownIcon, BookPlusIcon } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

function NoLorebookSelected() {
    return (
        <Empty className="my-6 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <BookDashedIcon />
                </EmptyMedia>
                <EmptyTitle>No Lorebook Selected</EmptyTitle>
                <EmptyDescription>
                    Select a lorebook from the dropdown to edit it, or create a new one to get
                    started.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function LorebookSettings() {
    const { lorebooks: preload } = useLoaderData({ from: "/settings/lorebooks" });
    const lorebooks = useLiveQuery(
        () => db.lorebooks.orderBy("updatedAt").reverse().toArray(),
        [],
        preload
    );

    const { id, index } = useSearch({ from: "/settings/lorebooks" });
    const navigate = useNavigate({ from: "/settings/lorebooks" });

    const selectedLorebook = lorebooks.find((lorebook) => lorebook.id === id);
    const updateLorebookID = (id: string) => {
        void navigate({
            search: { id }
        });
    };

    const updateEntryIndex = (index: number) => {
        void navigate({
            search: (prev) => ({ ...prev, index }),
            replace: true
        });
    };

    const createNewLorebook = async () => {
        const lorebook = new Lorebook();
        await lorebook.save();
        void navigate({
            search: { id: lorebook.id }
        });
    };

    const { browse, input } = useFileDialog({
        accept: ".json",
        onChange: async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            toast.promise(Lorebook.import(file), {
                loading: "Importing lorebook...",
                success: (lorebook: Lorebook) => {
                    void navigate({
                        search: { id: lorebook.id }
                    });
                    return "Lorebook imported successfully!";
                },
                error: (error: Error) => {
                    console.error("Lorebook import failed:", error);
                    return "Failed to import lorebook. Is it valid JSON?";
                }
            });
        }
    });

    return (
        <>
            <Header className="justify-between">
                <ButtonGroup>
                    <Button variant="outline" onClick={browse}>
                        {input}
                        <BookDownIcon />
                        Import
                    </Button>
                    <Button variant="outline" onClick={createNewLorebook}>
                        <BookPlusIcon />
                        New
                    </Button>
                </ButtonGroup>
            </Header>
            <div className="h-full pb-2 sm:overflow-hidden">
                <Card className="gap-0 overflow-hidden py-0 sm:h-full">
                    <CardContent className="flex h-full flex-col sm:flex-row sm:overflow-hidden">
                        <SidebarProvider className="min-h-0 gap-4 max-sm:flex-col">
                            <LorebookList
                                lorebooks={lorebooks}
                                selectedLorebook={selectedLorebook}
                                lorebookID={id}
                                setLorebookID={updateLorebookID}
                                entryIndex={index}
                                setEntryIndex={updateEntryIndex}
                            />
                            {selectedLorebook ? (
                                <LorebookEditor lorebook={selectedLorebook} entryIndex={index} />
                            ) : (
                                <NoLorebookSelected />
                            )}
                        </SidebarProvider>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export const Route = createFileRoute("/settings/lorebooks")({
    component: LorebookSettings,
    validateSearch: z.object({
        id: z.string().default(""),
        index: z.int().gte(0).default(0)
    }),
    head: () => ({
        meta: [{ title: "Lorebooks - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Lorebooks"
    }),
    loader: async () => {
        const [lorebooks, characters] = await Promise.all([
            db.lorebooks.orderBy("updatedAt").reverse().toArray(),
            db.characters.orderBy("data.name").toArray()
        ]);
        return { lorebooks, characters };
    },
    search: {
        middlewares: [
            stripSearchParams({
                id: "",
                index: 0
            })
        ]
    }
});
