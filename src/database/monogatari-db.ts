import { Asset } from "@/database/schema/asset";
import { Character } from "@/database/schema/character";
import { Chat } from "@/database/schema/chat";
import { Lorebook } from "@/database/schema/lorebook";
import { Persona } from "@/database/schema/persona";
import { Preset } from "@/database/schema/preset";
import Dexie, { type EntityTable } from "dexie";

class MonogatariDB extends Dexie {
    characters!: EntityTable<Character, "id">;
    personas!: EntityTable<Persona, "id">;
    chats!: EntityTable<Chat, "id">;
    presets!: EntityTable<Preset, "id">;
    lorebooks!: EntityTable<Lorebook, "id">;
    assets!: EntityTable<Asset, "id">;

    constructor() {
        super("monogatari");
        this.version(0.3).stores({
            characters: "&id, data.name, favorite, createdAt, updatedAt",
            personas: "&id, name, createdAt, updatedAt",
            chats: "&id, *characterIDs, updatedAt",
            presets: "&id, name, updatedAt",
            lorebooks:
                "&id, enabled, global, embeddedCharacterID, *linkedCharacterIDs, createdAt, updatedAt",
            assets: "&id, category, parentID, file.name, [category+parentID], &[parentID+file.name], createdAt"
        });
        this.characters.mapToClass(Character);
        this.personas.mapToClass(Persona);
        this.chats.mapToClass(Chat);
        this.presets.mapToClass(Preset);
        this.lorebooks.mapToClass(Lorebook);
        this.assets.mapToClass(Asset);
    }
}

export const db = new MonogatariDB();
