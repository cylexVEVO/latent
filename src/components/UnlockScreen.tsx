import { useRef, useState } from "react";
import { decrypt, deserializeBlobBinary } from "../crypto";
import type { EncryptedBlob } from "../crypto";
import type { Folder, Note } from "../types";

interface Props {
  onUnlock: (notes: Note[], folders: Folder[], password: string) => void;
}

function parseVault(json: string): { notes: Note[]; folders: Folder[] } {
  const raw = JSON.parse(json);
  if (Array.isArray(raw)) {
    // Legacy vault: plain Note[]
    return { notes: raw, folders: [] };
  }
  return { notes: raw.notes ?? [], folders: raw.folders ?? [] };
}

export default function UnlockScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState("");
  const [fileBlob, setFileBlob] = useState<EncryptedBlob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"new" | "open">("new");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleVaultFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buf = new Uint8Array(reader.result as ArrayBuffer);
      try {
        setFileBlob(deserializeBlobBinary(buf));
        setFileName(file.name);
        setError("");
      } catch {
        setError("Could not read vault file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  function clearFile() {
    setFileName(null);
    setFileBlob(null);
  }

  async function handleNew(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    onUnlock([], [], password);
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !fileBlob) return;
    setLoading(true);
    setError("");
    try {
      const json = await decrypt(fileBlob, password);
      const { notes, folders } = parseVault(json);
      onUnlock(notes, folders, password);
    } catch {
      setError("Wrong password or invalid vault.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-widest">Notes</p>
        <h1 className="text-lg font-medium text-neutral-900 mb-6">Encrypted vault</h1>

        <div className="flex gap-1 mb-5 border border-neutral-200 rounded p-0.5">
          {(["new", "open"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                mode === m ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-800"
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
                <div className="flex items-center justify-between border border-neutral-200 rounded px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs text-neutral-700 truncate">{fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-neutral-300 hover:text-neutral-600 transition-colors cursor-pointer ml-3 shrink-0 text-sm leading-none"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-neutral-200 rounded px-3 py-2.5 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer text-center"
                >
                  Load .enc file
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".enc"
                className="hidden"
                onChange={handleVaultFile}
              />
            </>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full border border-neutral-200 rounded px-3 py-2 text-sm outline-none focus:border-neutral-500 transition-colors text-neutral-800 placeholder-neutral-300"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password || (mode === "open" && !fileBlob)}
            className="w-full bg-neutral-900 hover:bg-neutral-700 disabled:opacity-30 text-white py-2 rounded text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Decrypting…" : mode === "new" ? "Create" : "Unlock"}
          </button>
        </form>

        <p className="text-xs text-neutral-300 mt-6 leading-relaxed">
          Notes are encrypted with AES-256-GCM. Nothing is sent to any server.
        </p>
      </div>
    </div>
  );
}
