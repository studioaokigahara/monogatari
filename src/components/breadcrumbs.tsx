import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useRouterState } from "@tanstack/react-router";
import React, { useMemo } from "react";

export function Breadcrumbs() {
    const matches = useRouterState({ select: (s) => s.matches });

    const crumbs = useMemo(() => {
        return matches.flatMap((match) => {
            const label = match.context.breadcrumb;

            if (!label || !label.trim()) {
                return [];
            }

            return [
                {
                    label,
                    to: match.pathname,
                    params: match.params,
                    search: match.search,
                },
            ];
        });
    }, [matches]);

    if (crumbs.length === 0) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {crumbs.map(({ label, to, params, search }, i) => {
                    const last = i === crumbs.length - 1;
                    const key = `${to}-${i}`;
                    return (
                        <React.Fragment key={key}>
                            <BreadcrumbItem>
                                {last ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link
                                            to={to}
                                            params={params}
                                            search={search}
                                        >
                                            {label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!last && <BreadcrumbSeparator />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
