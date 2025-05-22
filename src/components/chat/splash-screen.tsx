import { waveCircle } from "@lucide/lab";
import { Icon } from "lucide-react";
import { useMemo, useRef } from "react";
import SplashText from "../splash-text";

export default function SplashScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const lotto = useMemo(
        () => (Math.random() >= 0.1 ? "Monogatari" : "Mowonowogatari"),
        [],
    );

    return (
        <div className="flex grow min-w-3/5 max-w-3xl mx-auto place-center">
            <div className="flex flex-col gap-4 mt-auto mx-auto mb-16 text-center">
                <div className="flex flex-row gap-2">
                    <Icon iconNode={waveCircle} size={36} />
                    <h1
                        ref={ref}
                        className="text-4xl font-semibold leading-none tracking-tight"
                    >
                        {lotto}
                    </h1>
                    <SplashText ref={ref} />
                </div>
            </div>
        </div>
    );
}
