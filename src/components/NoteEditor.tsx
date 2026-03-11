import { useEffect, useRef, useState } from "react";
import type { Attachment, Folder, Note } from "../types";
import MarkdownEditor from "./MarkdownEditor";
import AttachmentPreviewModal from "./AttachmentPreviewModal";

interface Props {
  note: Note;
  folders: Folder[];
  onChange: (updated: Note) => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | undefined) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const props = { width: 11, height: 11, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "shrink-0" };

  if (mimeType.startsWith("audio/")) {
    return (
      <svg {...props} stroke="#a3a3a3">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <svg {...props} stroke="#a3a3a3">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  return (
    <svg {...props} stroke={mimeType === "application/pdf" ? "#ef4444" : "#a3a3a3"}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: await readFileAsBase64(file),
      size: file.size,
      createdAt: Date.now(),
    }))
  );
}

export default function NoteEditor({ note, folders, onChange, onDelete, onMoveToFolder }: Props) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    const newAttachments = await filesToAttachments(files);
    onChange({
      ...note,
      title,
      tags,
      attachments: [...(note.attachments ?? []), ...newAttachments],
      updatedAt: Date.now(),
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }

  function removeAttachment(id: string) {
    onChange({
      ...note,
      title,
      tags,
      attachments: (note.attachments ?? []).filter((a) => a.id !== id),
      updatedAt: Date.now(),
    });
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }

  const attachments = note.attachments ?? [];

  return (
    <div
      className="flex flex-col h-full bg-white relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-white/90 border-2 border-dashed border-neutral-300 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-neutral-400">Drop files to attach</p>
        </div>
      )}

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
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach files"
          className="text-neutral-300 hover:text-neutral-500 active:text-neutral-700 transition-colors cursor-pointer touch-manipulation shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
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

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 md:px-8 border-b border-neutral-100">
          {attachments.map((a) => {
            const isImage = a.mimeType.startsWith("image/");
            return (
              <div key={a.id} className="relative group">
                {isImage ? (
                  <button
                    type="button"
                    onClick={() => setPreview(a)}
                    className="block w-11 h-11 rounded overflow-hidden bg-neutral-100 hover:opacity-75 transition-opacity cursor-pointer"
                    title={`${a.name} (${formatSize(a.size)})`}
                  >
                    <img
                      src={`data:${a.mimeType};base64,${a.data}`}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreview(a)}
                    className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs px-2.5 py-1.5 rounded cursor-pointer transition-colors max-w-[160px]"
                    title={`${a.name} (${formatSize(a.size)})`}
                  >
                    <FileIcon mimeType={a.mimeType} />
                    <span className="truncate">{a.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-700 text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Body — CM6 live markdown editor */}
      <MarkdownEditor
        key={note.id}
        initialValue={note.body}
        onChange={handleBodyChange}
      />

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {preview && (
        <AttachmentPreviewModal
          attachment={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
