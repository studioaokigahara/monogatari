import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Link, useMatches } from "@tanstack/react-router";
import { Fragment } from "react";

export function Breadcrumbs() {
    const matches = useMatches();

    const breadcrumbData = matches.flatMap((match) => {
        const label = match.context.breadcrumb;

        return label?.trim()
            ? [
                  {
                      label,
                      to: match.pathname,
                      params: match.params
                  }
              ]
            : [];
    });

    const breadcrumbs = breadcrumbData.map(({ label, to, params }, index) => (
        <Fragment key={`${to}-${index}`}>
            {index === breadcrumbData.length - 1 ? (
                <BreadcrumbItem>
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
            ) : (
                <>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to={to} params={params}>
                                {label}
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                </>
            )}
        </Fragment>
    ));

    if (breadcrumbs.length === 0) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
        </Breadcrumb>
    );
}
