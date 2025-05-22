import { db } from "@/database/database";
import type { PromptRecord } from "@/database/schema/prompt";
import { nanoid } from "@/lib/utils";
import { v7 as uuid } from "uuid";

export async function listPrompts(): Promise<PromptRecord[]> {
    return db.prompts.toArray();
}

export async function getPrompt(id: string): Promise<PromptRecord | undefined> {
    return db.prompts.get(id);
}

export async function savePrompt(data: PromptRecord) {
    const now = new Date();
    await db.prompts.put({
        ...data,
        id: data.id || nanoid(),
        createdAt: data.createdAt || now,
        updatedAt: now,
    });
}

export async function deletePrompt(id: string) {
    await db.prompts.delete(id);
}
