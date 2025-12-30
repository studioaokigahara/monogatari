import Password from "@/components/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { db } from "@/database/monogatari-db";
import { useSettingsContext } from "@/hooks/use-settings-context";
import { SelectExploreProvider } from "@/routes/explore/components/select-provider";
import {
    ExportDatabase,
    ImportDatabase
} from "@/routes/settings/components/database-dialog";
import { createFileRoute } from "@tanstack/react-router";
import {
    Bird,
    Cat,
    Dog,
    Fish,
    HardDrive,
    Panda,
    Rabbit,
    Rat,
    Squirrel,
    Turtle,
    Worm
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
    Label as ChartLabel,
    Pie,
    PieChart,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart
} from "recharts";

const chubTooltip = `Necessary to show characters marked "NSFL" by Character Hub's moderation team. To get your API key, view the request headers for the search object while logged in: Right-click > Inspect > Network tab > Reload the page > Find 'search?...'. Your API key will be shown under the 'CH-API-KEY' and 'samwise' headers.`;

function StorageDisplay() {
    const [storage, setStorage] = useState<StorageEstimate>();

    useEffect(() => {
        const estimateStorage = async () => {
            const storage = await navigator.storage.estimate();
            setStorage(storage);
        };

        void estimateStorage();
    }, []);

    const chartData = useMemo(
        () => [
            {
                name: "storage",
                usage: storage?.usage || 0,
                fill: "var(--chart-1)"
            }
        ],
        [storage]
    );

    const chartConfig = {
        usage: {
            label: "Storage Used",
            color: "var(--chart-1)"
        }
    };

    const usagePercentage = useMemo(() => {
        if (!storage?.quota || !storage?.usage) return 0;
        return Math.round((storage.usage / storage.quota) * 360);
    }, [storage]);

    const formatBytes = (bytes?: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const [dbSize, setDBSize] = useState<Record<string, number>>();

    useEffect(() => {
        let cancelled = false;

        const encoder = new TextEncoder();

        const sizeOfValue = (value: any, seen: WeakSet<object>): number => {
            if (value === null || value === undefined) return 0;

            const t = typeof value;

            if (t === "string") {
                // UTF-8 byte length
                return encoder.encode(value).length;
            }
            if (t === "number") return 8;
            if (t === "boolean") return 1;
            if (value instanceof Date) return 8;

            // Binary types
            if (value instanceof Blob) return value.size;
            if (value instanceof File) return value.size;
            if (value instanceof ArrayBuffer) return value.byteLength;
            if (ArrayBuffer.isView(value))
                return (value as ArrayBufferView).byteLength;

            // Arrays
            if (Array.isArray(value)) {
                let sum = 0;
                for (const v of value) sum += sizeOfValue(v, seen);
                return sum;
            }

            // Objects / Maps / Sets
            if (t === "object") {
                if (seen.has(value)) return 0;
                seen.add(value);

                // Map
                if (value instanceof Map) {
                    let sum = 0;
                    for (const [k, v] of value.entries()) {
                        sum += sizeOfValue(k, seen) + sizeOfValue(v, seen);
                    }
                    return sum;
                }

                // Set
                if (value instanceof Set) {
                    let sum = 0;
                    for (const v of value.values()) {
                        sum += sizeOfValue(v, seen);
                    }
                    return sum;
                }

                // Plain object
                let sum = 0;
                for (const [k, v] of Object.entries(value)) {
                    // include key bytes too
                    sum += encoder.encode(k).length + sizeOfValue(v, seen);
                }
                return sum;
            }

            return 0;
        };

        const estimateDbSize = async () => {
            const tables = db.tables;
            const sizes: Record<string, number> = {};

            for (const table of tables) {
                let total = 0;

                // Stream through records to avoid loading entire table into memory
                try {
                    await table.each((record: any) => {
                        // fresh seen set per record to handle circular refs within a single record
                        total += sizeOfValue(record, new WeakSet<object>());
                    });
                } catch {
                    // Fallback if streaming fails: try toArray (may be heavy)
                    try {
                        const records = await table.toArray();
                        for (const record of records) {
                            total += sizeOfValue(record, new WeakSet<object>());
                        }
                    } catch {
                        // As a last resort, leave as 0 so we don't break the UI
                        total = 0;
                    }
                }

                sizes[table.name] = total;
            }

            if (!cancelled) setDBSize(sizes);
        };

        void estimateDbSize();

        return () => {
            cancelled = true;
        };
    }, []);

    const dbChartData = useMemo(() => {
        if (!dbSize) return [];
        const colors = [
            "var(--chart-1)",
            "var(--chart-2)",
            "var(--chart-3)",
            "var(--chart-4)",
            "var(--chart-5)"
        ];
        return Object.entries(dbSize).map(([name, size], index) => ({
            name,
            value: size,
            formattedValue: formatBytes(size),
            fill: colors[index % colors.length]
        }));
    }, [dbSize]);

    const dbChartConfig = useMemo(() => {
        if (!dbSize) return {};
        return Object.keys(dbSize).reduce(
            (acc, tableName) => {
                acc[tableName] = {
                    label: tableName
                };
                return acc;
            },
            {} as Record<string, { label: string }>
        );
    }, [dbSize]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <HardDrive />
                        Storage
                    </div>
                    <div className="flex gap-2">
                        <ExportDatabase />
                        <ImportDatabase />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-row items-center">
                <div className="mb-auto">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square h-62.5"
                    >
                        <RadialBarChart
                            data={chartData}
                            startAngle={90}
                            endAngle={90 + usagePercentage}
                            innerRadius={80}
                            outerRadius={110}
                        >
                            <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[86, 74]}
                            />
                            <RadialBar
                                dataKey="usage"
                                background
                                cornerRadius={10}
                            />
                            <PolarRadiusAxis
                                tick={false}
                                tickLine={false}
                                axisLine={false}
                            >
                                <ChartLabel
                                    content={({ viewBox }) => {
                                        if (
                                            viewBox &&
                                            "cx" in viewBox &&
                                            "cy" in viewBox
                                        ) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-3xl font-bold"
                                                    >
                                                        {usagePercentage}%
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                    }}
                                />
                            </PolarRadiusAxis>
                        </RadialBarChart>
                    </ChartContainer>
                    <div className="text-muted-foreground text-xs text-center">
                        {formatBytes(storage?.usage)} /{" "}
                        {formatBytes(storage?.quota)}
                    </div>
                </div>
                {dbChartData.length > 0 && (
                    <div>
                        <ChartContainer
                            config={dbChartConfig}
                            className="mx-auto aspect-square max-h-62.5"
                        >
                            <PieChart>
                                <ChartTooltip
                                    content={<ChartTooltipContent hideLabel />}
                                    formatter={(value, name) => [
                                        `${name}: `,
                                        formatBytes(value as number)
                                    ]}
                                />
                                <Pie data={dbChartData} dataKey="value" />
                            </PieChart>
                        </ChartContainer>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            {Object.entries(dbSize || {}).map(
                                ([name, size]) => (
                                    <div
                                        key={name}
                                        className="flex justify-between gap-2"
                                    >
                                        <span>{name}:</span>
                                        <span>{formatBytes(size)}</span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GeneralSettings() {
    const { settings, updateSettings } = useSettingsContext();

    const RandomIcon = useMemo(() => {
        const icons = [
            Dog,
            Cat,
            Rabbit,
            Fish,
            Squirrel,
            Turtle,
            Panda,
            Bird,
            Worm,
            Rat
        ];
        return icons[Math.floor(Math.random() * icons.length)];
    }, []);

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))] gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RandomIcon />
                        Miscellaneous
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="explore-provider">
                            Explore Provider
                        </Label>
                        <SelectExploreProvider />
                    </div>
                    <Password
                        label="Character Hub API Key"
                        tooltip={chubTooltip}
                        value={settings.apiKeys.chub}
                        onChange={(e) => {
                            updateSettings({
                                apiKeys: {
                                    ...settings.apiKeys,
                                    chub: e.target.value
                                }
                            });
                        }}
                    />
                </CardContent>
            </Card>
            <StorageDisplay />
        </div>
    );
}

export const Route = createFileRoute("/settings/")({
    component: GeneralSettings,
    beforeLoad: () => ({
        breadcrumb: null!
    })
});
