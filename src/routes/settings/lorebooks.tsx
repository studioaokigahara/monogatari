import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/database/monogatari-db";
import { LorebookEditor } from "@/routes/settings/components/lorebooks/editor";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { BookDashed, BookMarked } from "lucide-react";
import { useState } from "react";
import { LorebookList } from "./components/lorebooks/list";

function NoLorebookSelected() {
    return (
        <Empty className="mb-2 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <BookDashed />
                </EmptyMedia>
                <EmptyTitle>No Lorebook Selected</EmptyTitle>
                <EmptyDescription>
                    Select a lorebook from the dropdown to edit it, or create a
                    new one to get started.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function LorebookSettings() {
    const preload = useLoaderData({ from: "/settings/lorebooks" });
    const lorebooks = useLiveQuery(
        () => db.lorebooks.orderBy("updatedAt").reverse().toArray(),
        [],
        preload
    );

    const [selectedLorebookID, setSelectedLorebookID] = useState("");
    const selectedLorebook = lorebooks.find(
        (lorebook) => lorebook.id === selectedLorebookID
    );
    const [entryIndex, setEntryIndex] = useState(0);

    return (
        <div className="h-full pb-2 sm:overflow-hidden">
            <Card className="pb-0 gap-0 overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookMarked />
                        Lorebooks
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-full flex flex-col sm:flex-row sm:overflow-hidden">
                    <SidebarProvider className="min-h-0 flex-col sm:flex-row gap-4">
                        <LorebookList
                            lorebooks={lorebooks}
                            selectedLorebook={selectedLorebook}
                            lorebookState={[
                                selectedLorebookID,
                                setSelectedLorebookID
                            ]}
                            entryState={[entryIndex, setEntryIndex]}
                        />
                        {selectedLorebook ? (
                            <LorebookEditor
                                lorebook={selectedLorebook}
                                entryIndex={entryIndex}
                            />
                        ) : (
                            <NoLorebookSelected />
                        )}
                    </SidebarProvider>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute("/settings/lorebooks")({
    component: LorebookSettings,
    head: () => ({
        meta: [{ title: "Lorebooks - Monogatari" }]
    }),
    beforeLoad: () => ({
        breadcrumb: "Lorebooks"
    }),
    loader: () => db.lorebooks.orderBy("updatedAt").reverse().toArray()
});
