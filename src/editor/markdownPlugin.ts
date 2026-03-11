import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

// Returns true if any cursor falls on the same line(s) as the given range.
function cursorOnLines(view: EditorView, from: number, to: number): boolean {
  const doc = view.state.doc;
  const fromLine = doc.lineAt(from).number;
  const toLine = doc.lineAt(to).number;
  for (const sel of view.state.selection.ranges) {
    const ln = doc.lineAt(sel.head).number;
    if (ln >= fromLine && ln <= toLine) return true;
  }
  return false;
}

const HIDE = Decoration.replace({});
const mk = (cls: string) => Decoration.mark({ class: cls });

type Item = { from: number; to: number; value: Decoration };

function buildDecos(view: EditorView): DecorationSet {
  const marks: Item[] = [];
  const replaces: Item[] = [];

  function addMark(from: number, to: number, cls: string) {
    if (from >= to) return;
    marks.push({ from, to, value: mk(cls) });
  }

  function addHide(from: number, to: number) {
    if (from >= to) return;
    // Guard: skip if overlapping an existing replace range.
    for (const r of replaces) {
      if (from < r.to && to > r.from) return;
    }
    replaces.push({ from, to, value: HIDE });
  }

  syntaxTree(view.state).iterate({
    enter(node) {
      const { from, to, name } = node;

      switch (name) {
        // ── Containers: mark the full span for styling ──────────────────────
        case "StrongEmphasis":
          addMark(from, to, "cm-md-bold");
          break;
        case "Emphasis":
          addMark(from, to, "cm-md-italic");
          break;
        case "Strikethrough":
          addMark(from, to, "cm-md-strikethrough");
          break;
        case "InlineCode":
          addMark(from, to, "cm-md-inline-code");
          break;
        case "ATXHeading1":
          addMark(from, to, "cm-md-h1");
          break;
        case "ATXHeading2":
          addMark(from, to, "cm-md-h2");
          break;
        case "ATXHeading3":
          addMark(from, to, "cm-md-h3");
          break;
        case "ATXHeading4":
        case "ATXHeading5":
        case "ATXHeading6":
          addMark(from, to, "cm-md-h4");
          break;
        case "Blockquote":
          addMark(from, to, "cm-md-blockquote");
          break;
        case "FencedCode":
          addMark(from, to, "cm-md-code-block");
          break;
        case "HorizontalRule":
          addMark(from, to, "cm-md-hr");
          break;
        case "Link":
          addMark(from, to, "cm-md-link-text");
          break;

        // ── Marker nodes: hide when cursor is off the line ───────────────────
        case "EmphasisMark": {
          const parent = node.node.parent;
          if (!parent) break;
          if (cursorOnLines(view, parent.from, parent.to)) {
            addMark(from, to, "cm-md-syntax");
          } else {
            addHide(from, to);
          }
          break;
        }

        case "StrikethroughMark": {
          const parent = node.node.parent;
          if (!parent) break;
          if (cursorOnLines(view, parent.from, parent.to)) {
            addMark(from, to, "cm-md-syntax");
          } else {
            addHide(from, to);
          }
          break;
        }

        case "CodeMark": {
          const parent = node.node.parent;
          if (!parent || parent.name !== "InlineCode") break;
          if (cursorOnLines(view, parent.from, parent.to)) {
            addMark(from, to, "cm-md-syntax");
          } else {
            addHide(from, to);
          }
          break;
        }

        case "HeaderMark": {
          const parent = node.node.parent;
          if (!parent) break;
          if (cursorOnLines(view, parent.from, parent.to)) {
            addMark(from, to, "cm-md-syntax");
          } else {
            // Hide "## " — HeaderMark covers just the hashes; add 1 for the trailing space.
            const lineEnd = view.state.doc.lineAt(from).to;
            addHide(from, Math.min(to + 1, lineEnd));
          }
          break;
        }

        case "LinkMark":
        case "URL": {
          const parent = node.node.parent;
          if (!parent || parent.name !== "Link") break;
          if (cursorOnLines(view, parent.from, parent.to)) {
            addMark(from, to, "cm-md-syntax");
          } else {
            addHide(from, to);
          }
          break;
        }
      }
    },
  });

  // Sort each group by from → to, then interleave into a single ordered list.
  marks.sort((a, b) => a.from - b.from || a.to - b.to);
  replaces.sort((a, b) => a.from - b.from || a.to - b.to);

  const all: Item[] = [];
  let mi = 0, ri = 0;
  while (mi < marks.length && ri < replaces.length) {
    const m = marks[mi], r = replaces[ri];
    if (m.from < r.from || (m.from === r.from && m.to <= r.to)) {
      all.push(marks[mi++]);
    } else {
      all.push(replaces[ri++]);
    }
  }
  while (mi < marks.length) all.push(marks[mi++]);
  while (ri < replaces.length) all.push(replaces[ri++]);

  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to, value } of all) {
    builder.add(from, to, value);
  }
  return builder.finish();
}

export const markdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecos(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecos(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
