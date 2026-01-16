import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Check, Download, FileCheck } from "lucide-react";
import { Reducer, useEffect, useReducer, useRef } from "react";

type ButtonState = "ready_download" | "ready_update" | "downloading" | "done" | "error";
type ButtonAction = "download" | "success" | "failure" | "reset";

type InitialButtonState = "ready_download" | "ready_update";

function reducer(initialState: InitialButtonState): Reducer<ButtonState, ButtonAction> {
    return function (state, action) {
        switch (state) {
            case "ready_download":
            case "ready_update":
                if (action === "download") return "downloading";
                break;
            case "downloading":
                if (action === "success") return "done";
                else if (action === "failure") return "error";
                break;
            case "done":
                if (action === "reset") return "ready_update";
                break;
            case "error":
                if (action === "reset") return initialState;
                break;
        }
        return state;
    };
}

const buttonConfig: Record<ButtonState, { icon: React.ReactNode; label: string }> = {
    ready_download: { icon: <Download />, label: "Download" },
    ready_update: { icon: <FileCheck />, label: "Update" },
    downloading: { icon: <Spinner />, label: "Downloading..." },
    done: { icon: <Check />, label: "Done" },
    error: { icon: <AlertTriangle />, label: "Error" }
};

interface Props extends React.ComponentProps<typeof Button> {
    initialState: "ready_download" | "ready_update";
    onClick: () => Promise<void>;
}

export function DownloadButton({ initialState, onClick, ...props }: Props) {
    const [state, dispatch] = useReducer(reducer(initialState), initialState);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleClick = async () => {
        dispatch("download");
        try {
            await onClick();
            dispatch("success");
        } catch {
            dispatch("failure");
        } finally {
            timeoutRef.current = setTimeout(() => dispatch("reset"), 10_000);
        }
    };

    const { icon, label } = buttonConfig[state];

    return (
        <Button onClick={handleClick} {...props}>
            {icon}
            {label}
        </Button>
    );
}
