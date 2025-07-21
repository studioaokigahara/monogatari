import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo } from "react";

export interface SiblingNavigatorProps {
    current: number;
    total: number;
    goToPreviousSibling: () => void;
    goToNextSibling: () => void;
    disabled: boolean;
    className?: string;
    editing: boolean;
}

export const SiblingNavigator = memo(
    function SiblingNavigator({
        current,
        total,
        goToPreviousSibling,
        goToNextSibling,
        disabled,
        className,
        editing
    }: SiblingNavigatorProps) {
        if (total <= 1 || editing) return null;

        const handlePreviousClick: React.MouseEventHandler<
            HTMLButtonElement
        > = (_event) => {
            goToPreviousSibling();
        };

        const handleNextClick: React.MouseEventHandler<HTMLButtonElement> = (
            _event
        ) => {
            goToNextSibling();
        };

        return (
            <>
                <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    className={cn(className)}
                    onClick={handlePreviousClick}
                >
                    <ChevronLeft />
                </Button>
                <span className={cn("text-sm font-medium mx-2", className)}>
                    {current} / {total}
                </span>
                <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    className={cn(className)}
                    onClick={handleNextClick}
                >
                    <ChevronRight />
                </Button>
            </>
        );
    },
    (prev, next) =>
        prev.total === next.total &&
        prev.current === next.current &&
        prev.disabled === next.disabled &&
        prev.className === next.className &&
        prev.goToPreviousSibling === next.goToPreviousSibling &&
        prev.goToNextSibling === next.goToNextSibling
);

export interface Action {
    Icon: React.ComponentType;
    onClick?: () => void;
}

interface ActionButtonProps {
    actions: Action[];
    disabled: boolean;
    className?: string;
}

export const ActionButtons = memo(
    function ActionButtons({
        actions,
        disabled,
        className
    }: ActionButtonProps) {
        return (
            <>
                {actions.map((action, index) => (
                    <Button
                        key={index}
                        size="icon"
                        variant="ghost"
                        disabled={disabled}
                        className={className}
                        onClick={action.onClick}
                    >
                        <action.Icon />
                    </Button>
                ))}
            </>
        );
    },
    (prev, next) =>
        prev.disabled === next.disabled &&
        prev.actions.length === next.actions.length &&
        prev.actions.every(
            (a, i) =>
                a.Icon === next.actions[i].Icon &&
                a.onClick === next.actions[i].onClick
        )
);
