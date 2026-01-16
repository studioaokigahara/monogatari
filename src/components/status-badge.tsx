import { Badge } from "@/components/ui/badge"; // Adjust import path
import { cn } from "@/lib/utils"; // Adjust import path
import * as React from "react";

// Import necessary Lucide icons (add any new ones you might need)
import {
    BookOpen,
    Brain,
    Building,
    Clapperboard,
    Cloud,
    Code,
    Coffee,
    Dices, // Added more icons
    DiscAlbum,
    Film,
    Gamepad2,
    Headphones,
    MapPin,
    MessageSquare,
    Mic,
    Moon,
    Music,
    Newspaper,
    Palette,
    PenTool,
    Play,
    Podcast,
    Radio,
    Sun,
    Terminal,
    Tv,
    Utensils,
    Wrench,
    Zap
} from "lucide-react";

// --- Helper Function ---

function getRandomItem<T>(arr: T[]): T | undefined {
    // Allow undefined return for empty arrays
    if (!arr || arr.length === 0) {
        return undefined;
    }
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- Dynamic Data Lists ---

const games = [
    "Elden Ring",
    "DARK SOULS III",
    "Stardew Valley",
    "Baldur's Gate 3",
    "Cyberpunk 2077",
    "The Witcher 3",
    "Red Dead Redemption 2",
    "Hades",
    "Celeste",
    "Hollow Knight",
    "Minecraft",
    "Terraria",
    "Factorio",
    "Persona 5 Royal",
    "Nier: Automata",
    "Final Fantasy VII Rebirth",
    "Helldivers 2",
    "Lethal Company"
];
const rpgs = [
    // Can have overlapping or specific lists
    "Baldur's Gate 3",
    "Elden Ring",
    "Persona 5 Royal",
    "The Witcher 3",
    "Final Fantasy XIV",
    "Diablo IV",
    "Path of Exile"
];
const artists = [
    "Playboi Carti – MUSIC",
    "Kendrick Lamar – To Pimp a Butterfly",
    "Taylor Swift",
    "Tame Impala",
    "Radiohead",
    "Daft Punk",
    "Aphex Twin",
    "Bladee – Icedancer",
    "Mitski",
    "Frank Ocean",
    "Tyler, The Creator – IGOR",
    "King Gizzard & The Lizard Wizard",
    "Mac DeMarco",
    "Gorillaz",
    "Björk"
];
// const albums = [
//     // Optional: for more specific music status
//     "Whole Lotta Red",
//     "To Pimp a Butterfly",
//     "Discovery",
//     "Currents",
//     "In Rainbows",
//     "Blonde",
//     "IGOR",
//     "Nonagon Infinity",
//     "Vespertine",
// ];
const movies = [
    "Dune: Part Two",
    "Spirited Away",
    "Parasite",
    "Everything Everywhere All At Once",
    "Blade Runner 2049",
    "Mad Max: Fury Road",
    "Spider-Man: Across the Spider-Verse",
    "Pulp Fiction",
    "The Dark Knight",
    "Inception",
    "Oppenheimer",
    "Barbie",
    "Poor Things"
];
const series = [
    "Breaking Bad",
    "Game of Thrones",
    "Stranger Things",
    "The Office",
    "Attack on Titan",
    "Succession",
    "Severance",
    "Arcane",
    "Fleabag",
    "Chernobyl",
    "Shōgun",
    "Fallout"
];
const youtubers = [
    "Marques Brownlee (MKBHD)",
    "Vsauce",
    "Linus Tech Tips",
    "PewDiePie",
    "MrBeast",
    "Bon Appétit",
    "Kurzgesagt",
    "NileRed",
    "Summoning Salt",
    "penguinz0"
];
const podcasts = [
    "The Joe Rogan Experience",
    "This American Life",
    "Serial",
    "Stuff You Should Know",
    "My Brother, My Brother and Me",
    "Huberman Lab",
    "Critical Role",
    "Darknet Diaries"
];
const books = [
    "Dune",
    "Project Hail Mary",
    "Atomic Habits",
    "Sapiens",
    "The Three-Body Problem",
    "Mistborn",
    "1984",
    "Brave New World",
    "Klara and the Sun"
];
const topics = [
    // For learning
    "React Hooks",
    "Next.js",
    "TypeScript",
    "Python",
    "Quantum Physics",
    "Machine Learning",
    "History",
    "Graphic Design",
    "Blender",
    "Japanese"
];
const activities = [
    // For general/misc
    "making coffee",
    "debugging CSS",
    "browsing Reddit",
    "planning world domination",
    "daydreaming",
    "doing chores",
    "working out",
    "meditating",
    "snacking"
];
const codeTasks = [
    "coding a new feature",
    "refactoring legacy code",
    "writing unit tests",
    "optimizing queries",
    "setting up CI/CD",
    "reviewing a PR",
    "learning a new framework"
];

// --- Status Categories with Generator Functions ---

type StatusGenerator = () => string;
type StatusItem = string | StatusGenerator;

const statusCategories = [
    {
        name: "Gaming",
        icons: [Gamepad2, Dices], // Added Dices
        statuses: [
            () => `Playing ${getRandomItem(games) || "a cool game"}`,
            () => `Grinding in ${getRandomItem(rpgs) || "an RPG"}`,
            "In a competitive match",
            "Exploring a vast world",
            "Trying a new indie gem"
        ] as StatusItem[] // Type assertion for mixed array
    },
    {
        name: "Music",
        icons: [Headphones, Music, Radio, DiscAlbum, Mic, Podcast], // Added DiscAlbum, Mic, Podcast
        statuses: [
            () => `Listening to ${getRandomItem(artists) || "some music"}`,
            () => `Enjoying the ${getRandomItem(podcasts) || "a podcast"}`,
            "Discovering new artists",
            "Listening to Lo-fi beats",
            "Tuning into a radio show"
        ] as StatusItem[]
    },
    {
        name: "Watching",
        icons: [Tv, Film, Play, Clapperboard], // Added Clapperboard
        statuses: [
            () => `Watching ${getRandomItem(movies) || "a movie"}`,
            () => `Binge-watching ${getRandomItem(series) || "a series"}`,
            () => `Watching ${getRandomItem(youtubers) || "YouTube"}`,
            "Watching Twitch streams",
            "Catching up on anime"
        ] as StatusItem[]
    },
    {
        name: "Coding & Development",
        icons: [Code, Wrench, Brain, PenTool, Terminal], // Added Terminal
        statuses: [
            () => `${getRandomItem(codeTasks) || "Writing code"}`,
            "Debugging CSS", // Keep some specifics
            "Fixing bugs",
            "Stuck on a problem",
            () => `Learning ${getRandomItem(topics)?.split(" ")[0] || "something new"}` // e.g., Learning React
        ] as StatusItem[]
    },
    {
        name: "Reading & Learning",
        icons: [BookOpen, Brain, Newspaper], // Added Newspaper
        statuses: [
            () => `Reading ${getRandomItem(books) || "a book"}`,
            () => `Learning about ${getRandomItem(topics) || "something interesting"}`,
            "Reading documentation",
            "Studying",
            "Browsing the news"
        ] as StatusItem[]
    },
    {
        name: "General / Misc",
        icons: [
            Cloud,
            Coffee,
            Moon,
            Sun,
            MessageSquare,
            Palette,
            Utensils,
            MapPin,
            Building,
            Zap,
            Brain
        ], // Keep a broad pool
        statuses: [
            () => `Currently ${getRandomItem(activities) || "chilling"}`, // Use the activities list
            "In a meeting",
            "Staring into the void",
            "Thinking...",
            "Taking a break",
            "Online",
            "Offline" // Could have Moon/Sun icon logic tied to this later if desired
        ] as StatusItem[]
    }
];

// --- Color Themes (remains the same) ---
const colorThemes = [
    {
        name: "green",
        bg: "bg-green-500/10",
        text: "text-green-500",
        border: "border-green-500/20"
    },
    {
        name: "blue",
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        border: "border-blue-500/20"
    },
    {
        name: "red",
        bg: "bg-red-500/10",
        text: "text-red-500",
        border: "border-red-500/20"
    },
    {
        name: "yellow",
        bg: "bg-yellow-500/10",
        text: "text-yellow-500",
        border: "border-yellow-500/20"
    },
    {
        name: "purple",
        bg: "bg-purple-500/10",
        text: "text-purple-500",
        border: "border-purple-500/20"
    },
    {
        name: "pink",
        bg: "bg-pink-500/10",
        text: "text-pink-500",
        border: "border-pink-500/20"
    },
    {
        name: "indigo",
        bg: "bg-indigo-500/10",
        text: "text-indigo-500",
        border: "border-indigo-500/20"
    },
    {
        name: "gray",
        bg: "bg-gray-500/10",
        text: "text-gray-500",
        border: "border-gray-500/20"
    },
    {
        name: "orange",
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        border: "border-orange-500/20"
    },
    {
        name: "teal",
        bg: "bg-teal-500/10",
        text: "text-teal-500",
        border: "border-teal-500/20"
    },
    {
        name: "cyan",
        bg: "bg-cyan-500/10",
        text: "text-cyan-500",
        border: "border-cyan-500/20"
    }
];

// --- The Component ---

function RandomStatusBadge() {
    // 1. Select a random category
    const category = getRandomItem(statusCategories);

    // Default values in case category selection fails
    let status: string = "Idle";
    let IconComponent: React.ElementType = Zap; // Default icon

    if (category) {
        // 2. Select a random status item (string or generator function)
        const statusOrGenerator = getRandomItem(category.statuses);

        // 3. Generate the status string if it's a function, or use the string directly
        if (typeof statusOrGenerator === "function") {
            status = statusOrGenerator(); // Execute the function
        } else if (typeof statusOrGenerator === "string") {
            status = statusOrGenerator; // Use the string
        } else {
            status = `${category.name}...`; // Fallback if status selection failed
        }

        // 4. Select a random icon *from that category's icon pool*
        IconComponent = getRandomItem(category.icons) || Zap; // Fallback icon
    }

    // 5. Select a random color theme
    const theme = getRandomItem(colorThemes) || colorThemes[7]; // Fallback to gray theme

    // Combine the Tailwind classes
    const badgeClasses = cn(
        "flex items-center whitespace-nowrap",
        theme.bg,
        theme.text,
        theme.border
    );

    return (
        <Badge variant="outline" className={badgeClasses}>
            <IconComponent className="h-3 w-3 mr-1 shrink-0" aria-hidden="true" />
            {status}
        </Badge>
    );
}

export const StatusBadge = React.memo(RandomStatusBadge);
