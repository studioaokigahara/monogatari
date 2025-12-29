import { getSplashText } from "@/lib/splash-text";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";

interface SplashText {
    ref: React.RefObject<HTMLDivElement | null>;
}

export default function SplashText({ ref }: SplashText) {
    const [splashText, setSplashText] = useState(getSplashText);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const moveSplash = useCallback(() => {
        const parent = ref.current;
        const wrapper = wrapperRef.current;
        if (!parent || !wrapper) return;

        const top = parent.offsetTop + parent.offsetHeight / 2;
        const left =
            parent.offsetLeft + parent.offsetWidth - wrapper.offsetWidth / 2;

        wrapper.style.top = `${top + 10}px`;
        wrapper.style.left = `${left}px`;
    }, [ref]);

    useLayoutEffect(() => {
        moveSplash();
    }, [moveSplash]);

    useEffect(() => {
        const parent = ref.current;
        const wrapper = wrapperRef.current;
        if (!parent || !wrapper) return;

        const ro = new ResizeObserver(moveSplash);
        const io = new IntersectionObserver(moveSplash);
        ro.observe(parent);
        io.observe(wrapper);

        return () => {
            ro.disconnect();
            io.disconnect();
        };
    }, [moveSplash, ref, splashText]);

    return (
        <div ref={wrapperRef} className="max-w-64 w-max absolute">
            <span
                className="inline-block relative items-center text-lg font-mono text-yellow-300 text-shadow-lg shadow-current animate-splash-bounce"
                onClick={() => setSplashText(getSplashText())}
            >
                {splashText}
            </span>
        </div>
    );
}
