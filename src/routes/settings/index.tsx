import { BackupStatus } from "@/components/backup-status";
import { ExportDatabase, ImportDatabase } from "@/components/database-dialog";
import Header from "@/components/header";
import Password from "@/components/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useSettings } from "@/hooks/use-settings";
import { SelectExploreRepo } from "@/routes/settings/components/api/select-provider";
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
import { useEffect, useMemo, useRef, useState } from "react";
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
    const workerRef = useRef<Worker>(null);

    useEffect(() => {
        let cancelled = false;

        workerRef.current = new Worker(
            new URL("@/lib/workers/database-size.worker.ts", import.meta.url),
            {
                type: "module"
            }
        );

        workerRef.current.onmessage = (event: MessageEvent<Record<string, number>>) => {
            if (!cancelled) setDBSize(event.data);
        };

        workerRef.current.postMessage({});

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
                        <BackupStatus showDialogTrigger />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center sm:flex-row">
                <div className="mb-auto">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-62.5">
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
                            <RadialBar dataKey="usage" background cornerRadius={10} />
                            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <ChartLabel
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                    <div className="text-center text-xs text-muted-foreground">
                        {formatBytes(storage?.usage)} / {formatBytes(storage?.quota)}
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
                            {Object.entries(dbSize || {}).map(([name, size]) => (
                                <div key={name} className="flex justify-between gap-2">
                                    <span>{name}:</span>
                                    <span>{formatBytes(size)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GeneralSettings() {
    const { settings, updateSettings } = useSettings();

    const RandomIcon = useMemo(() => {
        const icons = [Dog, Cat, Rabbit, Fish, Squirrel, Turtle, Panda, Bird, Worm, Rat];
        return icons[Math.floor(Math.random() * icons.length)];
    }, []);

    return (
        <>
            <Header />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))] gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RandomIcon />
                            Miscellaneous
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SelectExploreRepo />
                        <Password
                            label="Character Hub API Key"
                            tooltip={chubTooltip}
                            value={settings.apiKeys.chub}
                            onChange={(event) => {
                                updateSettings((settings) => {
                                    settings.apiKeys.chub = event.target.value;
                                });
                            }}
                        />
                    </CardContent>
                </Card>
                <StorageDisplay />
            </div>
        </>
    );
}

export const Route = createFileRoute("/settings/")({
    component: GeneralSettings,
    beforeLoad: () => ({
        breadcrumb: null!
    })
});
