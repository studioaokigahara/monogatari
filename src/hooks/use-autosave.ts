import { useEffect, useRef } from "react";

interface Props {
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
    values: unknown;
    handleSubmit: () => void;
}

export default function useAutosave({
    isDirty,
    isValid,
    isSubmitting,
    values,
    handleSubmit
}: Props) {
    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasPendingSubmitRef = useRef(false);
    const versionRef = useRef(0);
    const lastSavedVersionRef = useRef(0);

    useEffect(() => {
        versionRef.current += 1;
    }, [values]);

    useEffect(() => {
        if (!isDirty) {
            lastSavedVersionRef.current = versionRef.current;
        }
    }, [isDirty]);

    useEffect(() => {
        if (isSubmitting) {
            hasPendingSubmitRef.current = true;
            return;
        }

        if (hasPendingSubmitRef.current) {
            hasPendingSubmitRef.current = false;
            lastSavedVersionRef.current = versionRef.current;
        }
    }, [isSubmitting]);

    useEffect(() => {
        if (autoSaveRef.current) {
            clearTimeout(autoSaveRef.current);
            autoSaveRef.current = null;
        }

        if (!isDirty || !isValid || isSubmitting) return;
        if (versionRef.current === lastSavedVersionRef.current) return;

        autoSaveRef.current = setTimeout(() => {
            hasPendingSubmitRef.current = true;
            handleSubmit();
            autoSaveRef.current = null;
        }, 250);

        return () => {
            if (autoSaveRef.current) {
                clearTimeout(autoSaveRef.current);
                autoSaveRef.current = null;
            }
        };
    }, [isDirty, isValid, isSubmitting, values, handleSubmit]);
}
