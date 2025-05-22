import { db } from "@/database/database";

import CharacterCard from "@/components/characters/card";
import ImportCharacter from "@/components/characters/import-character";
import NewCharacter from "@/components/characters/new-character";
import Header from "@/components/header";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "dexie-react-hooks";

function CharacterListItems() {
    const characters = useLiveQuery(
        () => db.characters.orderBy("id").reverse().toArray(),
        [],
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
    return (
        <>
            <Header className="justify-between flex-wrap">
                <div className="flex justify-center gap-2">
                    <ImportCharacter />
                    <NewCharacter />
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
