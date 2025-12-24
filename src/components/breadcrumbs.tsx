import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment } from "react";

export function Breadcrumbs() {
    const matches = useRouterState({ select: (state) => state.matches });

    const breadcrumbData = matches.flatMap((match) => {
        const label = match.context.breadcrumb;

        if (!label || !label.trim()) return [];

        return [
            {
                label,
                to: match.pathname,
                params: match.params
            }
        ];
    });

    const breadcrumbs = breadcrumbData.map(({ label, to, params }, index) => {
        const last = index === breadcrumbData.length - 1;
        const key = `${to}-${index}`;
        return (
            <Fragment key={key}>
                <BreadcrumbItem>
                    {last ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                            <Link to={to} params={params}>
                                {label}
                            </Link>
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>
                {!last && <BreadcrumbSeparator />}
            </Fragment>
        );
    });

    if (breadcrumbs.length === 0) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
        </Breadcrumb>
    );
}
