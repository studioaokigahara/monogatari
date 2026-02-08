import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { GFM } from "@lezer/markdown";
import {
    markdownTags,
    prosemarkBaseThemeSetup,
    prosemarkBasicSetup,
    prosemarkMarkdownSyntaxExtensions
} from "@prosemark/core";
import { pastePlainTextExtension, pasteRichTextExtension } from "@prosemark/paste-rich-text";
import { htmlBlockExtension } from "@prosemark/render-html";
import { createTheme } from "@uiw/codemirror-themes";
import CodeMirror, { Extension, ReactCodeMirrorProps } from "@uiw/react-codemirror";

// TODO: generate the TagStyle[] dynamically to match tailwind typography styling
const theme = createTheme({
    theme: "dark",
    settings: {
        background: "transparent",
        gutterBackground: "transparent",
        lineHighlight: "transparent"
    },
    styles: [
        {
            tag: tags.heading1,
            color: "var(--pm-heading-color)",
            fontWeight: "800",
            fontSize: "var(--text-4xl)",
            lineHeight: "var(--text-4xl--line-height)"
        },
        {
            tag: tags.heading2,
            color: "var(--pm-heading-color)",
            fontWeight: "700",
            fontSize: "var(--text-2xl)",
            lineHeight: "var(--text-2xl--line-height)"
        },
        {
            tag: tags.heading3,
            color: "var(--pm-heading-color)",
            fontWeight: "600",
            fontSize: "var(--text-xl)",
            lineHeight: "var(--text-xl--line-height)"
        },
        { tag: tags.heading4, color: "var(--pm-heading-color)", fontWeight: "600" },
        { tag: tags.heading5, color: "var(--pm-heading-color)", fontWeight: "600" },
        { tag: tags.heading6, color: "var(--pm-heading-color)", fontWeight: "600" },
        { tag: markdownTags.headerMark, color: "var(--pm-header-mark-color)" },
        { tag: markdownTags.listMark, color: "var(--pm-muted-color)" },
        { tag: markdownTags.escapeMark, color: "var(--pm-muted-color)" },
        {
            tag: tags.link,
            color: "var(--pm-link-color)",
            textDecoration: "underline",
            fontWeight: "500"
        },
        { tag: markdownTags.linkURL, color: "var(--pm-link-color)", textDecoration: "underline" },
        { tag: tags.strong, color: "var(--pm-bold-color)", fontWeight: "600" },
        { tag: tags.emphasis, fontStyle: "italic" },
        { tag: tags.strikethrough, textDecoration: "line-through" },
        {
            tag: markdownTags.inlineCode,
            color: "var(--pm-code-color)",
            fontWeight: "600",
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--pm-code-background-color)",
            padding: "0.2rem",
            borderRadius: "0.4rem",
            fontSize: "0.875em"
        },
        {
            tag: markdownTags.fencedCode,
            color: "var(--pm-code-block-color)",
            backgroundColor: "var(--tw-prose-pre-bg)",
            fontFamily: "var(--font-mono)",
            fontWeight: "400"
        },
        { tag: tags.meta, color: "var(--pm-muted-color)" },
        { tag: tags.comment, color: "var(--pm-muted-color)" }
    ]
});

const editorTheme = EditorView.theme({
    ".cm-line:has(.cm-foldPlaceholder) + .cm-line:has(br)": {
        display: "none !important"
    },
    ".cm-gutter:not(:last-child)": {
        display: "none !important"
    },
    ".cm-gutterElement": {
        fontSize: "var(--text-2xl)"
    },
    ".cm-foldPlaceholder": {
        marginLeft: "calc(var(--spacing) * 1) !important",
        backgroundColor: "transparent !important",
        borderStyle: "none !important",
        fontSize: "var(--text-xl)",
        letterSpacing: "0.25"
    },
    ".cm-widgetBuffer": {
        display: "none !important"
    }
});

export interface MarkdownEditorProps extends ReactCodeMirrorProps {
    value: string;
    placeholder?: string;
    onChange?: (markdown: string) => void;
}

export function MarkdownEditor({
    value,
    placeholder = "",
    onChange,
    ...props
}: MarkdownEditorProps) {
    const extensions = [
        markdown({
            codeLanguages: languages,
            extensions: [GFM, prosemarkMarkdownSyntaxExtensions]
        }),
        // this is () => Extension[] but typed as Extension
        // slice to get rid of default mark hiding extension at index 0
        (prosemarkBasicSetup() as Extension[]).slice(1),
        prosemarkBaseThemeSetup(),
        htmlBlockExtension,
        pasteRichTextExtension(),
        pastePlainTextExtension(),
        editorTheme
    ];

    return (
        <CodeMirror
            value={value}
            extensions={extensions}
            placeholder={placeholder}
            theme={theme}
            onChange={onChange}
            className="prose dark:prose-invert"
            {...props}
        />
    );
}
