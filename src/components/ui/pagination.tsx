import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, RegisteredRouter, ValidateLinkOptions } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
    return (
        <nav
            aria-label="pagination"
            data-slot="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
            {...props}
        />
    );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn("flex items-center gap-0.5", className)}
            {...props}
        />
    );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
    return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps<
    TRouter extends RegisteredRouter = RegisteredRouter,
    TOptions = unknown,
    TFrom extends string = string
> = {
    isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
    ValidateLinkOptions<TRouter, TOptions, TFrom>;

function PaginationLink<TRouter extends RegisteredRouter, TOptions, TFrom extends string>({
    children,
    className,
    isActive,
    size = "icon",
    disabled,
    ...props
}: PaginationLinkProps<TRouter, TOptions, TFrom>) {
    return (
        <Link
            aria-current={isActive ? "page" : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            disabled={disabled}
            className={cn(
                buttonVariants({
                    variant: isActive ? "outline" : "ghost",
                    size
                }),
                disabled && "cursor-default opacity-50",
                className
            )}
            {...(props as ValidateLinkOptions<TRouter, TOptions, TFrom>)}
        >
            {children}
        </Link>
    );
}

function PaginationPrevious<TRouter extends RegisteredRouter, TOptions, TFrom extends string>({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink<TRouter, TOptions, TFrom>>) {
    return (
        // @ts-expect-error multiple children is fine
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("pl-1.5!", className)}
            {...props}
        >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
        </PaginationLink>
    );
}

function PaginationNext<TRouter extends RegisteredRouter, TOptions, TFrom extends string>({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink<TRouter, TOptions, TFrom>>) {
    return (
        // @ts-expect-error multiple children is fine
        <PaginationLink
            aria-label="Go to next page"
            size="default"
            className={cn("pr-1.5!", className)}
            {...props}
        >
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon data-icon="inline-end" />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn(
                "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <MoreHorizontalIcon />
            <span className="sr-only">More pages</span>
        </span>
    );
}

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
};
