import { db } from "@/database/database";
import CharacterCard from "@/components/characters/card";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useFileDialog } from "@/hooks/use-file-dialog";
import { handleFileChange } from "@/lib/character/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { Import, UserPlus } from "lucide-react";
import { router } from "@/router";

function CharacterListItems() {
    const characters = useLiveQuery(
        () => db.characters.orderBy("id").reverse().toArray(),
        []
    );

    if (characters === undefined) {
        return (
            <>
                {[...Array(9)].map((_, index) => (
                    <Skeleton key={index} className="w-full h-48" />
                ))}
            </>
        );
    }

    if (!characters?.length) {
        return <p>No characters imported yet.</p>;
    }

    return (
        <>
            {characters?.map((character) => (
                <CharacterCard key={character.id} character={character} />
            ))}
        </>
    );
}

export default function CharacterList() {
    const { browse, input } = useFileDialog({
        accept: ".png, .json, .charx",
        onChange: handleFileChange
    });

    const navigateToCreation = () => {
        router.navigate({ to: "/characters/new" });
    };

    return (
        <>
            <Header className="justify-between flex-wrap">
                <div className="flex justify-center gap-2">
                    <Button onClick={browse}>
                        {input}
                        <Import />
                        Import
                    </Button>
                    <Button onClick={navigateToCreation}>
                        <UserPlus />
                        New Character
                    </Button>
                </div>
            </Header>
            <Pagination className="my-2">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink isActive href="#">
                            1
                        </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink href="#">2</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink href="#">3</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext href="#" />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
            <div className="overflow-auto">
                <div className="grid grid-flow-row grid-cols-[repeat(auto-fill,minmax(min(24rem,100%),1fr))] gap-2 my-2">
                    <CharacterListItems />
                </div>
            </div>
        </>
    );
}
