import { useState } from "react";

interface Props {
  blob: string;
  onClose: () => void;
}

export default function ExportModal({ blob, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(blob);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(blob);
    a.download = `vault-${Date.now()}.enc`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-200 rounded w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Encrypted vault</h2>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-500 text-xs cursor-pointer">
            Close
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Paste this blob into "Open vault" with your password to restore notes.
        </p>
        <textarea
          readOnly
          rows={6}
          value={blob}
          className="w-full border border-neutral-200 text-neutral-600 text-xs font-mono rounded px-3 py-2 resize-none outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex-1 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            className="flex-1 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Download .enc
          </button>
        </div>
      </div>
    </div>
  );
}
