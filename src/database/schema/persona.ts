import { db } from "@/database/monogatari-db";
import { generateCuid2 } from "@/lib/utils";
import { z } from "zod";

const PersonaRecord = z
    .object({
        id: z.cuid2().default(generateCuid2),
        name: z.string().default(""),
        description: z.string().default(""),
        createdAt: z.date().default(() => new Date()),
        updatedAt: z.date().default(() => new Date())
    })
    .prefault({});
type PersonaRecord = z.infer<typeof PersonaRecord>;

export class Persona implements PersonaRecord {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data?: Partial<Persona>) {
        const record = PersonaRecord.parse(data);
        this.id = record.id;
        this.name = record.name;
        this.description = record.description;
        this.createdAt = record.createdAt;
        this.updatedAt = record.updatedAt;
    }

    async save() {
        const record = PersonaRecord.parse(this);
        Object.assign(this, record);
        await db.personas.put(this);
    }

    static async load(id: string) {
        const persona = await db.personas.get(id);
        if (!persona) {
            throw new Error("Unabled to load persona, invalid id.");
        }
        return persona;
    }

    validate(data: Partial<Persona>) {
        const result = PersonaRecord.safeParse(data);
        return result.success ? undefined : result.error;
    }

    async update(data: Partial<Persona>) {
        const record = PersonaRecord.parse({ ...this, ...data });
        record.updatedAt = new Date();
        Object.assign(this, record);
        await db.personas.put(this);
    }

    async delete() {
        await db.personas.delete(this.id);
    }
}
