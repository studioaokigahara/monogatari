import { Breadcrumbs } from "@/components/breadcrumbs";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface HeaderProps extends React.ComponentProps<"header"> {
    children?: React.ReactNode;
    className?: string;
}

export default function Header({ children, className, ...props }: HeaderProps) {
    const mobile = useIsMobile();

    return (
        <header
            className={cn(
                mobile &&
                    "bg/background/33 sticky top-0 z-8 -mx-4 mb-2 -ml-8 border-b px-4 pl-8 backdrop-blur",
                "flex h-16 shrink-0 items-center transition-[width,height] ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
                className
            )}
            {...props}
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="my-auto mr-1 h-4!" />
                <Breadcrumbs />
            </div>
            {children}
        </header>
    );
}
