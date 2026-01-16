import { useThemeContext } from "@/contexts/theme";
import { useMobile } from "@/hooks/use-mobile";
import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useThemeContext();
    const isMobile = useMobile();

    return (
        <Sonner
            richColors
            position={isMobile ? "top-center" : "bottom-right"}
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius)"
                } as React.CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster };
