import { replaceMacros } from "@/lib/macros";
import { MacroContext } from "@/types/macros";
import { Root } from "mdast";
import { visit } from "unist-util-visit";

const ALLOWED_TAGS = new Set([
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "details",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "ins",
    "kbd",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "small",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "style",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul"
]);

const TAG_REGEX = /^\s*<\/?\s*([A-Za-z][A-Za-z0-9:-]*)\b/;

interface remarkXMLOptions {
    allowedTags?: Set<string>;
}

export function remarkXML(options: remarkXMLOptions = {}) {
    const allowedTags = options.allowedTags ?? ALLOWED_TAGS;
    return function (tree: Root) {
        visit(tree, "html", (node, index, parent) => {
            if (
                !("value" in node) ||
                typeof node.value !== "string" ||
                typeof index !== "number" ||
                !parent
            )
                return;

            const match = node.value.match(TAG_REGEX);
            if (!match) return;

            const tag = match[1].toLowerCase();
            if (allowedTags.has(tag)) return;

            if (parent.type === "paragraph" || parent.type === "heading") {
                parent.children[index] = { type: "text", value: node.value };
                return;
            }

            const normalized = node.value.replace(/\r\n/g, "\n");
            const blocks = normalized.split(/\n\s*\n/g);
            const xml = blocks.map((block) => ({
                type: "paragraph",
                children: [{ type: "text", value: block }]
            }));

            // @ts-expect-error we don't handle table rows
            parent.children.splice(index, 1, ...xml);
        });
    };
}

export function remarkMacros(context: MacroContext = {}) {
    return function (tree: Root) {
        visit(tree, ["text", "code", "inlineCode"] as const, (node) => {
            if ("value" in node && typeof node.value === "string" && node.value.includes("{{")) {
                node.value = replaceMacros(node.value, context);
            }
        });
    };
}
