export interface Decorator {
    name: string;
    value?: string | string[] | number | boolean;
    fallbacks?: Decorator[];
}

interface DecoratorContext {
    messageCount: number;
    tokenCount: number;
    greetingIndex?: number;
    userIcon?: string;
    previousMatches: Set<string>;
}

enum positionOptions {
    "after_desc",
    "before_desc",
    "personality",
    "scenario"
}

enum depthOptions {
    "depth",
    "reverse_depth",
    "instruct_depth",
    "reverse_instruct_depth"
}

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
        if (!value) return { name };

        if (value.includes(","))
            return {
                name,
                value: value.split(",").map((value) => value.trim())
            };

        return { name, value: this.parseValue(value.trim()) };
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
                } else break;
            } else if (line.startsWith("@@@")) {
                const fallback = this.parseDecorator(line.substring(1));
                if (fallback && decorators.length > 0) {
                    const lastDecorator = decorators[decorators.length - 1];
                    if (!lastDecorator.fallbacks) lastDecorator.fallbacks = [];
                    lastDecorator.fallbacks.push(fallback);
                }
            } else if (line.length > 0) break;
        }

        const text = lines.slice(startIndex).join("\n").trim();
        return { decorators, content: text };
    }

    static checkDecorator(
        decorator: Decorator,
        context: DecoratorContext,
        id: string
    ) {
        switch (decorator.name) {
            case "activate_only_after":
                return context.messageCount >= (decorator.value as number);
            case "activate_only_every":
                return context.messageCount % (decorator.value as number) === 0;
            case "keep_activate_after_match":
                return context.previousMatches.has(id);
            case "dont_activate_after_match":
                return !context.previousMatches.has(id);
            case "is_greeting":
                return context.greetingIndex === decorator.value;
            case "is_user_icon":
                return context.userIcon === decorator.value;
            case "dont_activate":
                return context.previousMatches.has("activate");
            case "activate":
            default:
                return true;
        }
    }

    static getInsertionPosition(
        decorators: Decorator[],
        context: DecoratorContext
    ): {
        position: "before" | "after" | "depth" | "position";
        depth?: number;
        role?: "system" | "user" | "assistant";
        positionType?: string;
    } {
        const positionDecorator = decorators.find((decorator) =>
            Object.values(positionOptions).includes(decorator.name)
        );

        if (positionDecorator) {
            return {
                position: "position",
                positionType: positionDecorator.value as string
            };
        }

        const depthDecorator = decorators.find((decorator) =>
            Object.values(depthOptions).includes(decorator.name)
        );

        if (depthDecorator) {
            let depth = depthDecorator.value as number;

            if (depthDecorator.name === "reverse_depth") {
                depth = context.messageCount - depth;
            } else if (depthDecorator.name === "reverse_instruct_depth") {
                depth = context.tokenCount - depth;
            }

            const roleDecorator = decorators.find(
                (decorator) => decorator.name === "role"
            );

            return {
                position: "depth",
                depth,
                role: roleDecorator?.value as any
            };
        }

        return { position: "before" };
    }

    static getScanDepth(decorators: Decorator[], scanDepth: number): number {
        const scanDepthDecorator = decorators.find(
            (decorator) =>
                decorator.name === "scan_depth" ||
                decorator.name === "instruct_scan_depth"
        );

        return scanDepthDecorator
            ? (scanDepthDecorator.value as number)
            : scanDepth;
    }
}
