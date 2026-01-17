import {
    format,
    getTime,
    isToday,
    isWithinInterval,
    isYesterday,
    startOfDay,
    startOfToday,
    startOfYesterday,
    subDays
} from "date-fns";

const Now = Date.now();
const Today = startOfToday();
const Yesterday = startOfYesterday();
const Week = startOfDay(subDays(Today, 7));
const Month = startOfDay(subDays(Today, 30));

const TIME_GROUPS = [
    {
        name: "Today" as const,
        test: (date: Date) => isToday(date)
    },
    {
        name: "Yesterday" as const,
        test: (date: Date) => isYesterday(date)
    },
    {
        name: "Last 7 Days" as const,
        test: (date: Date) => isWithinInterval(date, { start: Week, end: Yesterday })
    },
    {
        name: "Last 30 Days" as const,
        test: (date: Date) => isWithinInterval(date, { start: Month, end: Week })
    }
];

const TIME_GROUP_ORDER = new Map<string, number>(
    TIME_GROUPS.map((group, index) => [group.name, index])
);

export function getTimeGroup(date: Date): string {
    for (const { name, test } of TIME_GROUPS) {
        if (test(date)) return name;
    }

    return date.getFullYear() === new Date(Now).getFullYear()
        ? format(date, "LLLL")
        : format(date, "LLLL y");
}

export function sortByTimeGroupLabel(a: string, b: string): number {
    const a_i = TIME_GROUP_ORDER.get(a);
    const b_i = TIME_GROUP_ORDER.get(b);

    if (a_i !== undefined && b_i !== undefined) return a_i - b_i;
    if (a_i !== undefined) return -1;
    if (b_i !== undefined) return 1;

    const a_d = getTime(new Date(a));
    const b_d = getTime(new Date(b));

    return b_d - a_d;
}
