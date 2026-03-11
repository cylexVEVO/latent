import { useState } from "react";
import { encrypt, serializeBlob } from "./crypto";
import type { AppState, Folder, Note } from "./types";
import UnlockScreen from "./components/UnlockScreen";
import Sidebar from "./components/Sidebar";
import NoteEditor from "./components/NoteEditor";
import ExportModal from "./components/ExportModal";

function newNote(folderId?: string): Note {
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    tags: [],
    folderId,
    updatedAt: Date.now(),
  };
}

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "locked" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportBlob, setExportBlob] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | "unfiled" | null>(null);

  function handleUnlock(notes: Note[], folders: Folder[], password: string) {
    setState({ phase: "unlocked", notes, folders, password });
    setSelectedId(notes[0]?.id ?? null);
  }

  if (state.phase === "locked") {
    return <UnlockScreen onUnlock={handleUnlock} />;
  }

  const { notes, folders, password } = state;

  // Derive visible notes from active folder + tag filters
  let visibleNotes = notes;
  if (activeFolderId === "unfiled") {
    visibleNotes = visibleNotes.filter((n) => !n.folderId);
  } else if (activeFolderId) {
    visibleNotes = visibleNotes.filter((n) => n.folderId === activeFolderId);
  }
  if (activeTag) {
    visibleNotes = visibleNotes.filter((n) => n.tags.includes(activeTag));
  }

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  // ── Notes ────────────────────────────────────────────────────────────────
  function updateNote(updated: Note) {
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, notes: s.notes.map((n) => (n.id === updated.id ? updated : n)) }
        : s
    );
  }

  function addNote(folderId?: string) {
    const n = newNote(folderId);
    setState((s) =>
      s.phase === "unlocked" ? { ...s, notes: [n, ...s.notes] } : s
    );
    setSelectedId(n.id);
    // Expand the target folder if needed
    if (folderId) setActiveFolderId(folderId);
  }

  function deleteNote() {
    if (!selectedId) return;
    const remaining = notes.filter((n) => n.id !== selectedId);
    setState((s) =>
      s.phase === "unlocked" ? { ...s, notes: remaining } : s
    );
    setSelectedId(remaining[0]?.id ?? null);
  }

  function moveNote(noteId: string, folderId: string | undefined) {
    setState((s) =>
      s.phase === "unlocked"
        ? {
            ...s,
            notes: s.notes.map((n) =>
              n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n
            ),
          }
        : s
    );
  }

  // ── Folders ──────────────────────────────────────────────────────────────
  function addFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const f: Folder = { id: crypto.randomUUID(), name: trimmed, createdAt: Date.now() };
    setState((s) =>
      s.phase === "unlocked" ? { ...s, folders: [...s.folders, f] } : s
    );
  }

  function renameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) }
        : s
    );
  }

  function deleteFolder(id: string) {
    setState((s) =>
      s.phase === "unlocked"
        ? {
            ...s,
            folders: s.folders.filter((f) => f.id !== id),
            notes: s.notes.map((n) =>
              n.folderId === id ? { ...n, folderId: undefined } : n
            ),
          }
        : s
    );
    if (activeFolderId === id) setActiveFolderId(null);
  }

  // ── Vault ────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const payload = { version: 2, notes, folders };
      const blob = await encrypt(JSON.stringify(payload), password);
      setExportBlob(serializeBlob(blob));
    } finally {
      setExporting(false);
    }
  }

  function handleLock() {
    setState({ phase: "locked" });
    setSelectedId(null);
    setExportBlob(null);
    setActiveTag(null);
    setActiveFolderId(null);
  }

  return (
    <div className="flex h-screen bg-white text-neutral-900 overflow-hidden">
      <Sidebar
        notes={visibleNotes}
        allNotes={notes}
        folders={folders}
        allTags={allTags}
        activeTag={activeTag}
        activeFolderId={activeFolderId}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={addNote}
        onTagFilter={(t) => { setActiveTag((x) => (x === t ? null : t)); setSelectedId(null); }}
        onFolderSelect={(id) => { setActiveFolderId((x) => (x === id ? null : id)); setSelectedId(null); }}
        onFolderAdd={addFolder}
        onFolderRename={renameFolder}
        onFolderDelete={deleteFolder}
        onExport={handleExport}
        onLock={handleLock}
        exporting={exporting}
      />
      <main className="flex-1 overflow-hidden">
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            folders={folders}
            onChange={updateNote}
            onDelete={deleteNote}
            onMoveToFolder={(folderId) => moveNote(selected.id, folderId)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-300 text-sm">
            {notes.length === 0 ? "No notes. Hit + to start." : "Select a note."}
          </div>
        )}
      </main>
      {exportBlob && (
        <ExportModal blob={exportBlob} onClose={() => setExportBlob(null)} />
      )}
    </div>
  );
}
