interface Props {
  blob: Uint8Array;
  onClose: () => void;
}

export default function ExportModal({ blob, onClose }: Props) {
  function download() {
    const url = URL.createObjectURL(new Blob([blob.buffer as ArrayBuffer], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-${Date.now()}.enc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Export vault</h2>
          <button onClick={onClose} className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-300 text-xs cursor-pointer">
            Close
          </button>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Downloads a binary <span className="font-mono">.enc</span> file. Open it from the unlock screen with your password to restore your notes.
        </p>
        <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded px-3 py-2">
          <span>vault.enc</span>
          <span>{(blob.byteLength / 1024).toFixed(1)} KB</span>
        </div>
        <button
          onClick={download}
          className="w-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:hover:bg-neutral-300 dark:text-neutral-900 text-white py-2 rounded text-sm font-medium transition-colors cursor-pointer"
        >
          Download .enc
        </button>
      </div>
    </div>
  );
}
