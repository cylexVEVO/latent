import { useRef, useState } from "react";
import { decrypt, deserializeBlobBinary, encrypt, serializeBlobBinary } from "../crypto";
import type { EncryptedBlob } from "../crypto";
import type { Folder, Note } from "../types";

interface Props {
  onUnlock: (notes: Note[], folders: Folder[], password: string, fileHandle?: FileSystemFileHandle) => void;
}

function parseVault(json: string): { notes: Note[]; folders: Folder[] } {
  const raw = JSON.parse(json);
  if (Array.isArray(raw)) {
    // Legacy vault: plain Note[]
    return { notes: raw, folders: [] };
  }
  return { notes: raw.notes ?? [], folders: raw.folders ?? [] };
}

const hasFsApi = "showOpenFilePicker" in window;

export default function UnlockScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState("");
  const [fileBlob, setFileBlob] = useState<EncryptedBlob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"new" | "open">("new");
  const fileRef = useRef<HTMLInputElement>(null);

  // Fallback: classic <input type="file"> for browsers without FS API
  function handleVaultFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buf = new Uint8Array(reader.result as ArrayBuffer);
      try {
        setFileBlob(deserializeBlobBinary(buf));
        setFileName(file.name);
        setFileHandle(null);
        setError("");
      } catch {
        setError("Could not read vault file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  // FS API picker for browsers that support it
  async function handlePickFile() {
    try {
      const [handle] = await (window as unknown as { showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
        types: [{ description: "Vault", accept: { "application/octet-stream": [".enc"] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const buf = new Uint8Array(await file.arrayBuffer());
      setFileBlob(deserializeBlobBinary(buf));
      setFileName(file.name);
      setFileHandle(handle);
      setError("");
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        setError("Could not read vault file.");
      }
    }
  }

  function clearFile() {
    setFileName(null);
    setFileBlob(null);
    setFileHandle(null);
  }

  async function handleNew(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    let handle: FileSystemFileHandle | undefined;
    if ("showSaveFilePicker" in window) {
      try {
        const showSave = (window as unknown as { showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
        handle = await showSave({
          suggestedName: "vault.enc",
          types: [{ description: "Vault", accept: { "application/octet-stream": [".enc"] } }],
        });
        // Write initial empty vault so the file isn't left empty
        const blob = await encrypt(JSON.stringify({ version: 2, notes: [], folders: [] }), password);
        const bytes = serializeBlobBinary(blob);
        const writable = await handle.createWritable();
        await writable.write(bytes.buffer as ArrayBuffer);
        await writable.close();
      } catch (err) {
        if ((err as DOMException).name !== "AbortError") {
          setError("Could not save vault file.");
          setLoading(false);
          return;
        }
        // User cancelled picker — proceed without a handle
        handle = undefined;
      }
    }

    setLoading(false);
    onUnlock([], [], password, handle);
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !fileBlob) return;
    setLoading(true);
    setError("");
    try {
      const json = await decrypt(fileBlob, password);
      const { notes, folders } = parseVault(json);
      onUnlock(notes, folders, password, fileHandle ?? undefined);
    } catch {
      setError("Wrong password or invalid vault.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-widest">Notes</p>
        <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-6">Encrypted vault</h1>

        <div className="flex gap-1 mb-5 border border-neutral-200 dark:border-neutral-700 rounded p-0.5">
          {(["new", "open"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); clearFile(); }}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                mode === m
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {m === "new" ? "New vault" : "Open vault"}
            </button>
          ))}
        </div>

        <form onSubmit={mode === "new" ? handleNew : handleOpen} className="space-y-3">
          {mode === "open" && (
            <>
              {fileName ? (
                <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{fileName}</span>
                    {fileHandle && (
                      <span className="text-xs text-neutral-300 dark:text-neutral-600 shrink-0">· linked</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer ml-3 shrink-0 text-sm leading-none"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={hasFsApi ? handlePickFile : () => fileRef.current?.click()}
                  className="w-full border border-dashed border-neutral-200 dark:border-neutral-700 rounded px-3 py-2.5 text-xs text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer text-center"
                >
                  Load .enc file
                </button>
              )}
              {!hasFsApi && (
                <input
                  ref={fileRef}
                  type="file"
                  accept=".enc"
                  className="hidden"
                  onChange={handleVaultFile}
                />
              )}
            </>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:focus:border-neutral-400 transition-colors text-neutral-800 dark:text-neutral-200 placeholder-neutral-300 dark:placeholder-neutral-600 bg-transparent"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password || (mode === "open" && !fileBlob)}
            className="w-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:hover:bg-neutral-300 dark:text-neutral-900 disabled:opacity-30 text-white py-2 rounded text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (mode === "new" ? "Creating…" : "Decrypting…") : mode === "new" ? "Create" : "Unlock"}
          </button>
        </form>

        <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-6 leading-relaxed">
          Notes are encrypted with AES-256-GCM. Nothing is sent to any server.
          {hasFsApi && " Changes save automatically to your .enc file."}
        </p>
      </div>
    </div>
  );
}
