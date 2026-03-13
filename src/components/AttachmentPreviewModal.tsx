import { useEffect } from "react";
import type { Attachment } from "../types";

interface Props {
  attachment: Attachment;
  onClose: () => void;
}

function dataUrl(a: Attachment) {
  return `data:${a.mimeType};base64,${a.data}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function decodeText(base64: string) {
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    );
  } catch {
    return "Could not decode file.";
  }
}

export default function AttachmentPreviewModal({ attachment, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = dataUrl(attachment);
  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";
  const isText = attachment.mimeType.startsWith("text/");
  const isAudio = attachment.mimeType.startsWith("audio/");
  const isVideo = attachment.mimeType.startsWith("video/");

  function download() {
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.name;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="min-w-0 mr-4">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{attachment.name}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{formatSize(attachment.size)}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={download}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto min-h-0 p-5 flex items-start justify-center">
          {isImage && (
            <img
              src={url}
              alt={attachment.name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
          {isPdf && (
            <iframe
              src={url}
              className="w-full border-0 rounded"
              style={{ height: "70vh" }}
              title={attachment.name}
            />
          )}
          {isText && (
            <pre className="text-xs text-neutral-700 dark:text-neutral-300 font-mono whitespace-pre-wrap w-full leading-relaxed">
              {decodeText(attachment.data)}
            </pre>
          )}
          {isAudio && (
            <div className="w-full flex flex-col items-center gap-6 py-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 dark:text-neutral-600">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <audio controls src={url} className="w-full max-w-md" />
            </div>
          )}
          {isVideo && (
            <video
              controls
              src={url}
              className="max-w-full rounded"
              style={{ maxHeight: "70vh" }}
            />
          )}
          {!isImage && !isPdf && !isText && !isAudio && !isVideo && (
            <div className="flex flex-col items-center gap-4 py-16">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-300 dark:text-neutral-600"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{attachment.name}</p>
              <p className="text-xs text-neutral-300 dark:text-neutral-600">{formatSize(attachment.size)}</p>
              <button
                onClick={download}
                className="text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-4 py-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
