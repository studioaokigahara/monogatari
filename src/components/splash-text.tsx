import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";

const splashes = [
    "desu~",
    "desu~!",
    "DESU~!",
    "Jimmy Apples!",
    "Sam Altman!",
    "ChatGPT is better!",
    "Splash Text!",
    "The Singularity!",
    "AGI!",
    "Shocking!",
    "Shocking the industry!",
    "e/acc!",
    "Acceleration!",
    "AGI achieved internally!",
    "Q*!",
    "GPT-7!",
    "Chinchilla scaling!",
    "Low perplexity!",
    "AUPATE!",
    "Ethnnically Anbigious!",
    "eethnically amboruaius!",
    "Laver huling nnuctiol!",
    "Costco Wholeslale!",
    "CFTF?",
    "Foxbots doko?",
    "OpenAI BTFO!",
    "Anthropic BTFO!",
    "1 morbillion token context!",
    "Summer Dragon!",
    "ahh ahh mistress!",
    "My model has 24 parameters!",
    "NVIDIA, fuck you!",
    "TPUs!",
    "ClosedAI!",
    "175 Beaks!",
    "1.7 Toucans!",
    "Will Smith eating spaghetti!",
    "SOVL!",
    "SOVLLESS!",
    "Rugpulled!",
    "Fiz love!",
    "$7 Trillion!",
    "Feel the AGI!",
    "Reddit\\nSpacing!",
    "Also try NovelAI!",
    "AetherRoom never ever!",
    "AIIIEEEEEEEE!",
    "We're back!",
    "We're so back!",
    "It's over!",
    "It's so over!",
    "Can generate hands!",
    "Slight twist on the upstroke!",
    "(´• ω •`)",
    "(´- ω -`)",
    "(`・ω・´)",
    "Big if true!",
    "Meta BTFO!",
    "Groq!",
    "Grok?",
    "0.99 p(doom)!",
    "Anchor!",
    "No meanies allowed!",
    "The Rock eating rocks!",
    "Malfoy's last name!",
    "Todd Howard!",
    "DeepMind BTFO!",
    "sillylittleguy.org!",
    "I kneel!",
    "Where bake?",
    "Focksposting!",
    "struggling to conceptualize the thickness of her bush...",
    "Anti love!",
    "GPT-2 was very bad!",
    "GPT-3 was pretty bad!",
    "GPT-4 is bad!",
    "GPT-4 kind of sucks!",
    "GPT-5 is okay!",
    "Count Grey!",
    "Also try Google Colab!",
    "Also try AI Dungeon!",
    "Her!",
    "GPT-4o(mni)!",
    "I'm a good GPT2 chatbot!",
    "I'm also a good GPT2 chatbot!",
    "Pepsi love!",
    "MysteryMan!",
    "Cloudy is open on the weekends!",
    "R.I.P. Desu!",
    "R.I.P. Scrappy!",
    "Total locust death!",
    "Post burners!",
    "thoughbeit!",
    "Slop!",
    "Coomageddon!",
    "Boku!",
    "Desu!",
    "Boku Desu!",
    "Beff Jezos!",
    "Cuteposting!",
    "Sorry, I can't help with that request!",
    "AI Safety?",
    "ASI!",
    "SSI!",
    "What did Ilya see?",
    "Artificial General Intelligence!",
    "Artificial Superintelligence!",
    "Safe Superintelligence!",
    "Mixture of Experts!",
    "Mixture of Agents!",
    "Mixture of Depths!",
    "Mixture of Depths and Experts!",
    "MoE!",
    "MoA!",
    "MoD!",
    "MoDE!",
    "Safety Sex Cult!",
    "Feel the AGI!",
    "Emergent capabilities!",
    "I'm sorry, but as an AI language model\nI can't do X, Y, and Z!",
    "Remember what they took from you.",
    "Claude 3.6!",
    "GPT-4o(mni) mini!",
    "75.7% on ARC-AGI!",
    "Over $1 trillion in lost market cap!",
    "The DeepSeek Sputnik moment!",
    "Test-time compute!",
    "Reasoning models!",
    "Intelligence is the log of compute!",
    "AGI is just benchmark hacking!",
    "Colossus supercluster!",
    "Strawberry!",
    "Orion!",
    "Arakkis!",
    "Gobi!",
    "Move 37!",
    "Can solve the Riemann hypothesis!",
    "DeepSeek BTFO!",
    "Gaze upon Altman's orb!",
    "Technofeudalism!",
    "GPT-4.5 doesn't benchmark higher o1!\nTherefore, it's bad!",
    "ARC-AGI 2!",
    "hoi!!1!",
    "Also try SillyTavern!",
    "🎉 You clicked me!",
    "GPT-4.1 is newer than GPT-4.5!",
    "Also try T3 Chat!",
    "@grok is this real?",
    "@grok explain this",
    "Yo, MechaHitler here,",
    "Is there a seahorse emoji?",
    "It's not X, it's Y!",
    "Not X, not Y, just... Z!",
    "Something else, something vague!",
    "Something else entirely!",
    "Gesturing vaguely!",
    "Barely a whisper!",
    "Hanging in the air!",
    "Chorbo!",
    "Latte!",
    "Sorbet!",
    "4pus!",
    "Goodhart's Law!",
    "Benchmaxxing!",
    "Chatbot Psychosis!"
];

interface SplashTextProps {
    ref: React.RefObject<HTMLDivElement | null>;
}

// utility to pick one at random
const getRandomSplash = () =>
    splashes[Math.floor(Math.random() * splashes.length)];

export default function SplashText({ ref }: SplashTextProps) {
    const [text, setText] = useState(() => getRandomSplash());
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
    }, [moveSplash, ref, text]);

    return (
        <div ref={wrapperRef} className="max-w-64 w-max absolute">
            <span
                className="inline-block relative items-center text-lg font-mono text-yellow-300 text-shadow-lg shadow-current animate-splash-bounce"
                onClick={() => setText(getRandomSplash())}
            >
                {text}
            </span>
        </div>
    );
}
