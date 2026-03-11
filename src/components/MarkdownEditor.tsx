import { useEffect, useRef } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { Strikethrough } from "@lezer/markdown";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdownPlugin } from "../editor/markdownPlugin";
import { minimalTheme } from "../editor/theme";

interface Props {
  initialValue: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ initialValue, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          markdown({ extensions: [Strikethrough] }),
          EditorView.lineWrapping,
          placeholder("…"),
          minimalTheme,
          markdownPlugin,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    return () => view.destroy();
  }, []); // intentionally empty — component is remounted via key when note changes

  return <div ref={containerRef} className="flex-1 overflow-auto h-full" />;
}
