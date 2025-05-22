import type React from "react";
import { Badge } from "@/components/ui/badge";

interface ActivityItemProps {
    title: string;
    description: string;
    date: string;
    icon: React.ReactNode;
    game: string;
}

export function ActivityItem({
    title,
    description,
    date,
    icon,
    game,
}: ActivityItemProps) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    {icon}
                </div>
            </div>
            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{title}</h3>
                    <Badge
                        variant="outline"
                        className="bg-primary/5 border-primary/20 text-xs"
                    >
                        {game}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
                <p className="text-xs text-muted-foreground mt-1">{date}</p>
            </div>
        </div>
    );
}
