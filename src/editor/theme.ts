import { EditorView } from "@codemirror/view";

export const minimalTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "14px",
      fontFamily: "inherit",
      backgroundColor: "transparent",
      color: "#404040",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      padding: "20px 32px",
      lineHeight: "1.75",
      overflow: "auto",
      fontFamily: "inherit",
    },
    ".cm-content": { padding: 0 },
    ".cm-line": { padding: 0 },
    ".cm-cursor": { borderLeftColor: "#404040" },
    ".cm-selectionBackground": { backgroundColor: "#e5e5e5 !important" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "#d4d4d4 !important" },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-gutters": { display: "none" },

    // Markdown element styles
    ".cm-md-h1": { fontSize: "1.6em", fontWeight: "700", lineHeight: "1.3" },
    ".cm-md-h2": { fontSize: "1.35em", fontWeight: "700", lineHeight: "1.35" },
    ".cm-md-h3": { fontSize: "1.15em", fontWeight: "600" },
    ".cm-md-h4": { fontWeight: "600" },
    ".cm-md-bold": { fontWeight: "700" },
    ".cm-md-italic": { fontStyle: "italic" },
    ".cm-md-strikethrough": { textDecoration: "line-through" },
    ".cm-md-inline-code": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      backgroundColor: "#f4f4f4",
      borderRadius: "3px",
      padding: "0 3px",
      fontSize: "0.88em",
    },
    ".cm-md-code-block": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: "0.88em",
      display: "block",
    },
    ".cm-md-code-block-line": {
      backgroundColor: "#f8f8f8",
      display: "block",
      paddingLeft: "12px !important",
      borderLeft: "2px solid #e5e5e5",
    },
    ".cm-md-blockquote": {
      borderLeft: "2px solid #d4d4d4",
      paddingLeft: "12px !important",
      color: "#737373",
    },
    ".cm-md-link-text": {
      color: "#2563eb",
      textDecoration: "underline",
      textUnderlineOffset: "2px",
    },
    ".cm-md-hr": { color: "#d4d4d4" },
    // Visible syntax markers when cursor is on the line
    ".cm-md-syntax": { color: "#c4c4c4" },
  },
  { dark: false }
);
