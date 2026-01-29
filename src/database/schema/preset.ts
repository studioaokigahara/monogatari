import { db } from "@/database/monogatari-db";
import { generateCuid2 } from "@/lib/utils";
import { z } from "zod";
import { SillyTavernPresetConverter } from "./preset/sillytavern";

export const Prompt = z
    .object({
        id: z.cuid2().default(generateCuid2),
        name: z.string().default(""),
        role: z.enum(["system", "user", "assistant"]).default("system"),
        content: z.string().default(""),
        enabled: z.boolean().default(true),
        position: z.enum(["before", "after"]).default("before"),
        depth: z.int().nonnegative().default(0)
    })
    .prefault({});
export type Prompt = z.infer<typeof Prompt>;

const defaultPrompts = [
    {
        name: "System Prompt (Card)",
        content: "{{char.system_prompt}}"
    },
    {
        name: "Lorebook (Before)",
        content: "{{lorebook.before}}"
    },
    {
        name: "Persona",
        content: "{{user.description}}"
    },
    {
        name: "Card Description",
        content: "{{char.description}}"
    },
    {
        name: "Card Personality",
        content: "{{char.personality}}"
    },
    {
        name: "Scenario",
        content: "{{char.scenario}}"
    },
    {
        name: "Lorebook (After)",
        content: "{{lorebook.after}}"
    },
    {
        name: "Example Dialogue",
        content: "{{char.mes_example}}"
    },
    {
        name: "Post-History Instructions (Card)",
        content: "{{char.post_history_instructions}}",
        position: "after"
    }
];

const PresetRecord = z.object({
    id: z.cuid2().default(generateCuid2),
    name: z.string().default("New Preset"),
    description: z.string().default("readme.md"),
    prompts: z.array(Prompt).default(defaultPrompts.map((prompt) => Prompt.parse(prompt))),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});
type PresetRecord = z.infer<typeof PresetRecord>;

export class Preset implements PresetRecord {
    id: string;
    name: string;
    description: string;
    prompts: Prompt[];
    createdAt: Date;
    updatedAt: Date;

    constructor(data?: Partial<Preset>) {
        const record = PresetRecord.prefault({}).parse(data);
        this.id = record.id;
        this.name = record.name;
        this.description = record.description;
        this.prompts = record.prompts;
        this.createdAt = record.createdAt;
        this.updatedAt = record.updatedAt;
    }

    async save() {
        const record = PresetRecord.parse(this);
        await db.presets.put(record);
        Object.assign(this, record);
    }

    static async load(id: string) {
        const preset = await db.presets.get(id);
        if (!preset) {
            throw new Error(`Invalid preset ID ${id}`);
        }
        return preset;
    }

    static validate(data: Partial<Preset>) {
        const result = PresetRecord.safeParse(data);
        return result.success ? undefined : result.error;
    }

    serialize(): PresetRecord {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            prompts: this.prompts,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    async update(data: Partial<Preset>) {
        if (!PresetRecord.partial().safeParse(data).success) {
            throw new Error("Received malformed preset update");
        }

        const update = PresetRecord.parse({ ...this.serialize(), ...data });
        update.updatedAt = new Date();
        await db.presets.update(this.id, update);
        Object.assign(this, update);
    }

    static parse(json: unknown) {
        const parsers = [PresetRecord, SillyTavernPresetConverter];
        for (const parser of parsers) {
            const result = parser.safeParse(json);
            if (result.success) return result.data;
        }
        throw new Error("Preset does not match any implemented schema");
    }

    static async import(preset: File) {
        const text = await preset.text();
        const json = JSON.parse(text);
        const data = this.parse(json);

        if (!data.name) {
            data.name = preset.name.split(".json")[0];
        }

        const newPreset = new Preset(data);
        await newPreset.save();

        return newPreset;
    }

    async delete() {
        await db.presets.delete(this.id);
    }
}
