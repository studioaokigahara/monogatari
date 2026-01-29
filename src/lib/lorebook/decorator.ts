type DecoratorNames =
    | "activate_only_after"
    | "activate_only_every"
    | "keep_activate_after_match"
    | "dont_activate_after_match"
    | "depth"
    | "instruct_depth"
    | "reverse_depth"
    | "reverse_instruct_depth"
    | "role"
    | "scan_depth"
    | "instruct_scan_depth"
    | "is_greeting"
    | "position"
    | "ignore_on_max_context"
    | "additional_keys"
    | "exclude_keys"
    | "is_user_icon"
    | "dont_activate"
    | "activate"
    | "disable_ui_prompt";

type CustomDecoratorNames =
    | "match_whole_words"
    | "activate_only_on_recursion"
    | "ignore_on_recursion"
    | "recursion_depth";

export interface Decorator {
    name: DecoratorNames | CustomDecoratorNames;
    value?: string | string[] | number | boolean;
    fallbacks?: Decorator[];
}

interface DecoratorContext {
    messageCount: number;
    tokenCount: number;
    greetingIndex?: number;
    userIcon?: string;
}

interface InsertionPosition {
    position: "before" | "after" | "depth" | "position";
    depth?: number;
    role?: "system" | "user" | "assistant";
    positionType?: string;
}

const PositionDecorators = ["after_desc", "before_desc", "personality", "scenario"] as const;
type PositionDecorator = (typeof PositionDecorators)[number];

const DepthDecorators = [
    "depth",
    "reverse_depth",
    "instruct_depth",
    "reverse_instruct_depth"
] as const;
type DepthDecorator = (typeof DepthDecorators)[number];

export class DecoratorParser {
    static parseValue(value: string) {
        if (value === "true") return true;
        if (value === "false") return false;

        const number = Number(value);
        if (!isNaN(number)) return number;

        return value;
    }

    static parseDecorator(decorator: string): Decorator | null {
        const match = decorator.match(/^@@(\w+)(?:\s+(.+))?$/);
        if (!match) return null;

        const [_, name, value] = match;
        if (!value) return { name: name as Decorator["name"] };

        if (value.includes(",")) {
            return {
                name: name as Decorator["name"],
                value: value.split(",").map((value) => value.trim())
            };
        }

        return {
            name: name as Decorator["name"],
            value: this.parseValue(value.trim())
        };
    }

    static parseContent(content: string) {
        const lines = content.split("\n");
        const decorators = [];
        let startIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("@@")) {
                const decorator = this.parseDecorator(line);
                if (decorator) {
                    decorators.push(decorator);
                    startIndex = i + 1;
                } else {
                    break;
                }
            } else if (line.startsWith("@@@")) {
                const fallback = this.parseDecorator(line.substring(1));
                if (fallback && decorators.length > 0) {
                    const lastDecorator = decorators[decorators.length - 1];
                    if (!lastDecorator.fallbacks) lastDecorator.fallbacks = [];
                    lastDecorator.fallbacks.push(fallback);
                }
            } else if (line.length > 0) {
                break;
            }
        }

        const text = lines.slice(startIndex).join("\n").trim();
        return { decorators, content: text };
    }

    static getInsertionPosition(
        decorators: Decorator[],
        context: DecoratorContext
    ): InsertionPosition {
        const positionDecorator = decorators.find((decorator) =>
            PositionDecorators.includes(decorator.name as PositionDecorator)
        );

        if (positionDecorator) {
            return {
                position: "position",
                positionType: positionDecorator.value as string
            };
        }

        const depthDecorator = decorators.find((decorator) =>
            DepthDecorators.includes(decorator.name as DepthDecorator)
        );

        if (depthDecorator) {
            let depth = depthDecorator.value as number;

            if (depthDecorator.name === "reverse_depth") {
                depth = context.messageCount - depth;
            } else if (depthDecorator.name === "reverse_instruct_depth") {
                depth = context.tokenCount - depth;
            }

            const roleDecorator = decorators.find((decorator) => decorator.name === "role");

            return {
                position: "depth",
                depth,
                role: roleDecorator?.value as any
            };
        }

        return { position: "before" };
    }

    static getScanDepth(decorators: Decorator[], scanDepth: number): number {
        const scanDepthDecorator = decorators.find((decorator) => decorator.name === "scan_depth");

        return scanDepthDecorator ? (scanDepthDecorator.value as number) : scanDepth;
    }
}
