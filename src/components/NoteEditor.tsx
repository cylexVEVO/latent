import { useEffect, useRef, useState } from "react";
import type { Folder, Note } from "../types";
import MarkdownEditor from "./MarkdownEditor";

interface Props {
  note: Note;
  folders: Folder[];
  onChange: (updated: Note) => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | undefined) => void;
}

export default function NoteEditor({ note, folders, onChange, onDelete, onMoveToFolder }: Props) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");
  const tagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags);
  }, [note.id]);

  function commitTitle(newTitle: string) {
    onChange({ ...note, title: newTitle, tags, updatedAt: Date.now() });
  }

  function handleBodyChange(body: string) {
    onChange({ ...note, title, tags, body, updatedAt: Date.now() });
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t)) { setTagInput(""); return; }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    onChange({ ...note, title, tags: next, updatedAt: Date.now() });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    onChange({ ...note, title, tags: next, updatedAt: Date.now() });
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length) removeTag(tags[tags.length - 1]);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Title */}
      <div className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-4 border-b border-neutral-100">
        <input
          className="flex-1 text-neutral-900 text-base font-medium outline-none placeholder-neutral-200"
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => commitTitle(title)}
        />
        {folders.length > 0 && (
          <select
            value={note.folderId ?? ""}
            onChange={(e) => onMoveToFolder(e.target.value || undefined)}
            className="text-xs text-neutral-400 bg-transparent outline-none cursor-pointer border-none"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={onDelete}
          className="text-neutral-300 hover:text-red-400 active:text-red-400 text-xs transition-colors cursor-pointer touch-manipulation shrink-0"
        >
          Delete
        </button>
      </div>

      {/* Tags */}
      <div
        className="flex flex-wrap items-center gap-1.5 px-4 py-2 md:px-8 border-b border-neutral-100 cursor-text min-h-[36px]"
        onClick={() => tagRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-500 text-xs px-2 py-0.5 rounded"
          >
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-neutral-300 hover:text-neutral-600 cursor-pointer leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={tagRef}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[80px] text-xs text-neutral-500 outline-none placeholder-neutral-300 bg-transparent"
        />
      </div>

      {/* Body — CM6 live markdown editor */}
      <MarkdownEditor
        key={note.id}
        initialValue={note.body}
        onChange={handleBodyChange}
      />
    </div>
  );
}
