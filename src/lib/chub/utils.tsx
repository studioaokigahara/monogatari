import { ButtonState } from "@/types/chub";
import {
    AlertTriangle,
    Check,
    CheckSquare,
    Download,
    FileCheck,
    Loader,
} from "lucide-react";

export function getButtonIcon(state: ButtonState) {
    switch (state) {
        case ButtonState.READY_DOWNLOAD:
            return <Download className="size-4" />;
        case ButtonState.READY_UPDATE:
            return <FileCheck className="size-4" />;
        case ButtonState.IN_QUEUE:
            return <CheckSquare className="size-4" />;
        case ButtonState.DOWNLOADING:
            return <Loader className="size-4 animate-spin" />;
        case ButtonState.DONE:
            return <Check className="size-4" />;
        case ButtonState.ERROR:
            return <AlertTriangle className="size-4" />;
        default:
            return <Download className="size-4" />;
    }
}

export function getButtonText(state: ButtonState) {
    switch (state) {
        case ButtonState.READY_DOWNLOAD:
            return "Download";
        case ButtonState.READY_UPDATE:
            return "Update";
        case ButtonState.IN_QUEUE:
            return "Added to queue";
        case ButtonState.DOWNLOADING:
            return "Downloading...";
        case ButtonState.DONE:
            return "Done";
        case ButtonState.ERROR:
            return "Error";
        default:
            return "Download";
    }
}
