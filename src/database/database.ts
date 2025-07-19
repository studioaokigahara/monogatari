import type { CharacterRecord } from "@/database/schema/character";
import type { ChatRecord } from "@/database/schema/chat";
import type { PersonaRecord } from "@/database/schema/persona";
import type { PromptSet } from "@/database/schema/prompt-set";
import Dexie, { type EntityTable } from "dexie";

class monogatariDatabase extends Dexie {
    characters!: EntityTable<CharacterRecord, "id">;
    personas!: EntityTable<PersonaRecord, "id">;
    chats!: EntityTable<ChatRecord, "id">;
    promptSets!: EntityTable<PromptSet, "id">;

    constructor() {
        super("monogatari");
        this.version(0.2).stores({
            characters: "&id, data.name, createdAt, favorite",
            chats: "&id, *characterIDs, updatedAt",
            promptSets: "&id, name, updatedAt",
            personas: "&id, name, createdAt, updatedAt"
        });
    }
}

export const db = new monogatariDatabase();
