import { useEffect, useState } from "react";
import type { Attachment, Note } from "../types";
import AttachmentPreviewModal from "./AttachmentPreviewModal";

interface Props {
  notes: Note[];
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
}

type TypeFilter = "all" | "image" | "audio" | "video" | "file";

interface Item {
  attachment: Attachment;
  noteId: string;
  noteTitle: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeOf(a: Attachment): TypeFilter {
  if (a.mimeType.startsWith("image/")) return "image";
  if (a.mimeType.startsWith("audio/")) return "audio";
  if (a.mimeType.startsWith("video/")) return "video";
  return "file";
}

export default function AttachmentGallery({ notes, onClose, onSelectNote }: Props) {
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [preview, setPreview] = useState<Attachment | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !preview) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, preview]);

  const allItems: Item[] = notes.flatMap((note) =>
    (note.attachments ?? []).map((attachment) => ({
      attachment,
      noteId: note.id,
      noteTitle: note.title || "Untitled",
    }))
  );

  const filtered = filter === "all" ? allItems : allItems.filter((i) => typeOf(i.attachment) === filter);

  const counts = {
    all: allItems.length,
    image: allItems.filter((i) => typeOf(i.attachment) === "image").length,
    audio: allItems.filter((i) => typeOf(i.attachment) === "audio").length,
    video: allItems.filter((i) => typeOf(i.attachment) === "video").length,
    file: allItems.filter((i) => typeOf(i.attachment) === "file").length,
  };

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "image", label: "Images" },
    { key: "audio", label: "Audio" },
    { key: "video", label: "Video" },
    { key: "file", label: "Files" },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Attachment gallery</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{allItems.length} attachment{allItems.length !== 1 ? "s" : ""} across {notes.filter(n => n.attachments?.length).length} note{notes.filter(n => n.attachments?.length).length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        {tabs.map(({ key, label }) => counts[key] > 0 || key === "all" ? (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1 rounded transition-colors cursor-pointer ${
              filter === key
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`ml-1 ${filter === key ? "opacity-60" : "text-neutral-300 dark:text-neutral-600"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ) : null)}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-300 dark:text-neutral-700 text-sm">
            {allItems.length === 0 ? "No attachments yet." : `No ${filter} attachments.`}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(({ attachment: a, noteId, noteTitle }) => (
              <div key={a.id} className="group flex flex-col gap-1">
                {/* Thumbnail / file chip */}
                <div className="relative">
                  {a.mimeType.startsWith("image/") ? (
                    <button
                      onClick={() => setPreview(a)}
                      className="w-full aspect-square rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 hover:opacity-80 transition-opacity cursor-pointer"
                      title={a.name}
                    >
                      <img
                        src={`data:${a.mimeType};base64,${a.data}`}
                        alt={a.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => setPreview(a)}
                      className="w-full aspect-square rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-3"
                      title={a.name}
                    >
                      <FileTypeIcon mimeType={a.mimeType} />
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 text-center leading-tight line-clamp-2 break-all">
                        {a.name}
                      </span>
                    </button>
                  )}
                  {/* Jump-to-note overlay */}
                  <button
                    onClick={() => { onSelectNote(noteId); onClose(); }}
                    className="absolute bottom-0 inset-x-0 flex items-center gap-1.5 px-2 py-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-b"
                    title={`Go to note: ${noteTitle}`}
                  >
                    <span className="text-xs truncate flex-1 text-left">{noteTitle}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                {/* Meta */}
                <div className="px-0.5">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate" title={a.name}>
                    {a.name}
                  </p>
                  <p className="text-xs text-neutral-300 dark:text-neutral-600">{formatSize(a.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <AttachmentPreviewModal attachment={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const cls = "shrink-0";
  if (mimeType.startsWith("audio/")) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${cls} text-neutral-300 dark:text-neutral-600`}>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${cls} text-neutral-300 dark:text-neutral-600`}>
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${cls} ${mimeType === "application/pdf" ? "text-red-300" : "text-neutral-300 dark:text-neutral-600"}`}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
