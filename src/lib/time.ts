import { DateTime } from "luxon";

const Now = DateTime.local();
const Today = Now.startOf("day");
const Yesterday = Now.minus({ days: 1 }).startOf("day");
const Week = Now.minus({ days: 7 }).startOf("day");
const Month = Now.minus({ days: 30 }).startOf("day");

const TIME_GROUPS = [
    {
        name: "Today" as const,
        test: (dateTime: DateTime) => dateTime >= Today,
    },
    {
        name: "Yesterday" as const,
        test: (dateTime: DateTime) => dateTime >= Yesterday && dateTime < Today,
    },
    {
        name: "Last 7 Days" as const,
        test: (dateTime: DateTime) => dateTime >= Week && dateTime < Yesterday,
    },
    {
        name: "Last 30 Days" as const,
        test: (dateTime: DateTime) => dateTime >= Month && dateTime < Week,
    },
];

const TIME_GROUP_ORDER = new Map<string, number>(
    TIME_GROUPS.map((group, index) => [group.name, index]),
);

export function getTimeGroup(dateTime: DateTime): string {
    for (const { name, test } of TIME_GROUPS) {
        if (test(dateTime)) return name;
    }

    return dateTime.year === Now.year
        ? dateTime.toFormat("LLLL")
        : dateTime.toFormat("LLLL yyyy");
}

export function sortByTimeGroupLabel(a: string, b: string): number {
    const a_i = TIME_GROUP_ORDER.get(a);
    const b_i = TIME_GROUP_ORDER.get(b);

    if (a_i !== undefined && b_i !== undefined) return a_i - b_i;
    if (a_i !== undefined) return -1;
    if (b_i !== undefined) return 1;

    const parseLabel = (label: string) => {
        let dateTime = DateTime.fromFormat(label, "LLLL yyyy");
        if (!dateTime.isValid) {
            dateTime = DateTime.fromFormat(label, "LLLL").set({
                year: Now.year,
            });
        }
        return dateTime.toMillis();
    };

    const a_d = parseLabel(a);
    const b_d = parseLabel(b);

    return b_d - a_d;
}
