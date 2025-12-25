import { Breadcrumbs } from "@/components/breadcrumbs";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface HeaderProps extends React.ComponentProps<"header"> {
    children?: React.ReactNode;
    className?: string;
}

export default function Header({ children, className, ...props }: HeaderProps) {
    return (
        <header
            className={cn(
                "flex h-16 shrink-0 items-center transition-[width,height] ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
                className
            )}
            {...props}
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-4! mr-1" />
                <Breadcrumbs />
            </div>
            {children}
        </header>
    );
}
