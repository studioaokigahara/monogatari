import { db } from "@/database/monogatari-db";

declare const self: Worker;

function calculateValueSize(value: any, seenValues: WeakSet<object>): number {
    if (value === null || value === undefined) return 0;

    const type = typeof value;
    const encoder = new TextEncoder();

    switch (type) {
        case "string":
            return encoder.encode(value).length;
        case "boolean":
            return 1;
        case "number":
            return 8;
    }

    if (value instanceof Date) return 8;
    if (value instanceof Blob) return value.size;
    if (value instanceof File) return value.size;
    if (value instanceof ArrayBuffer) return value.byteLength;

    if (ArrayBuffer.isView(value)) {
        return (value as ArrayBufferView).byteLength;
    }

    if (Array.isArray(value)) {
        let sum = 0;
        for (const v of value) sum += calculateValueSize(v, seenValues);
        return sum;
    }

    if (type === "object") {
        if (seenValues.has(value)) return 0;
        seenValues.add(value);

        if (value instanceof Map) {
            let sum = 0;
            for (const [key, keyValue] of value.entries()) {
                sum +=
                    calculateValueSize(key, seenValues) + calculateValueSize(keyValue, seenValues);
            }
            return sum;
        }

        if (value instanceof Set) {
            let sum = 0;
            for (const v of value.values()) {
                sum += calculateValueSize(v, seenValues);
            }
            return sum;
        }

        let sum = 0;
        for (const [key, keyValue] of Object.entries(value)) {
            sum += encoder.encode(key).length + calculateValueSize(keyValue, seenValues);
        }
        return sum;
    }

    return 0;
}

async function estimateDatabaseSize() {
    const tables = db.tables;
    const sizes: Record<string, number> = {};

    await Promise.all(
        tables.map(async (table) => {
            const records = await table.toArray();
            let total = 0;
            for (const record of records) {
                total += calculateValueSize(record, new WeakSet());
            }
            sizes[table.name] = total;
        })
    );

    return sizes;
}

self.onmessage = async (_event: MessageEvent) => {
    const databaseSize = await estimateDatabaseSize();
    self.postMessage(databaseSize);
};
