import { useEffect, useRef } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { Strikethrough } from "@lezer/markdown";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { markdownPlugin } from "../editor/markdownPlugin";
import { minimalTheme, darkTheme } from "../editor/theme";
import { formattingKeymap } from "../editor/formatting";

interface Props {
  initialValue: string;
  onChange: (value: string) => void;
}

const darkMq = window.matchMedia("(prefers-color-scheme: dark)");

export default function MarkdownEditor({ initialValue, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const themeCompartment = new Compartment();

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          keymap.of([
            ...formattingKeymap,
            ...searchKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          markdown({ extensions: [Strikethrough] }),
          EditorView.lineWrapping,
          placeholder("…"),
          search({ top: false }),
          themeCompartment.of(darkMq.matches ? darkTheme : minimalTheme),
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

    function handleMqChange(e: MediaQueryListEvent) {
      view.dispatch({
        effects: themeCompartment.reconfigure(e.matches ? darkTheme : minimalTheme),
      });
    }
    darkMq.addEventListener("change", handleMqChange);

    return () => {
      darkMq.removeEventListener("change", handleMqChange);
      view.destroy();
    };
  }, []); // intentionally empty — component is remounted via key when note changes

  return <div ref={containerRef} className="flex-1 overflow-auto h-full" />;
}
