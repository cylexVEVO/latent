import type { KeyBinding } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

function wrapSelection(view: EditorView, marker: string): boolean {
  const spec = view.state.changeByRange((range) => {
    if (range.empty) {
      return {
        range: EditorSelection.cursor(range.from + marker.length),
        changes: [{ from: range.from, insert: marker + marker }],
      };
    }
    return {
      range: EditorSelection.range(
        range.from + marker.length,
        range.to + marker.length
      ),
      changes: [
        { from: range.from, insert: marker },
        { from: range.to, insert: marker },
      ],
    };
  });
  view.dispatch(view.state.update(spec, { userEvent: "input" }));
  return true;
}

function insertLink(view: EditorView): boolean {
  const spec = view.state.changeByRange((range) => {
    if (range.empty) {
      // [](url) — cursor inside brackets
      return {
        range: EditorSelection.cursor(range.from + 1),
        changes: [{ from: range.from, insert: "[](url)" }],
      };
    }
    // [selected text](url) — select "url"
    const text = view.state.sliceDoc(range.from, range.to);
    const urlStart = range.from + text.length + 3;
    return {
      range: EditorSelection.range(urlStart, urlStart + 3),
      changes: [{ from: range.from, to: range.to, insert: `[${text}](url)` }],
    };
  });
  view.dispatch(view.state.update(spec, { userEvent: "input" }));
  return true;
}

export const formattingKeymap: KeyBinding[] = [
  { key: "Mod-b", run: (v) => wrapSelection(v, "**") },
  { key: "Mod-i", run: (v) => wrapSelection(v, "*") },
  { key: "Mod-k", run: insertLink },
];
