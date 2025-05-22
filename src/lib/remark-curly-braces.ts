import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { type MacroContext, replaceMacros } from "./curly-braces";

export interface RemarkCurlyBraceProps extends MacroContext {}

export default function remarkCurlyBraces({
    ...props
}: RemarkCurlyBraceProps): Plugin<[MacroContext?]> {
    return (tree, file) => {
        visit(tree, "text", (node) => {
            node.value = replaceMacros(node.value, props);
        });
    };
}
