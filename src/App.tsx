import { useState } from "react";
import { encrypt, serializeBlob } from "./crypto";
import type { AppState, Folder, Note } from "./types";
import UnlockScreen from "./components/UnlockScreen";
import Sidebar from "./components/Sidebar";
import NoteEditor from "./components/NoteEditor";
import ExportModal from "./components/ExportModal";
import ChangePasswordModal from "./components/ChangePasswordModal";

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
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | "unfiled" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  function handleChangePassword(newPassword: string) {
    setState((s) =>
      s.phase === "unlocked" ? { ...s, password: newPassword } : s
    );
    setChangingPassword(false);
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
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        notes={visibleNotes}
        allNotes={notes}
        folders={folders}
        allTags={allTags}
        activeTag={activeTag}
        activeFolderId={activeFolderId}
        selectedId={selectedId}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => { setSelectedId(id); setSidebarOpen(false); }}
        onNew={addNote}
        onTagFilter={(t) => { setActiveTag((x) => (x === t ? null : t)); setSelectedId(null); }}
        onFolderSelect={(id) => { setActiveFolderId((x) => (x === id ? null : id)); setSelectedId(null); }}
        onFolderAdd={addFolder}
        onFolderRename={renameFolder}
        onFolderDelete={deleteFolder}
        onExport={handleExport}
        onLock={handleLock}
        onChangePassword={() => setChangingPassword(true)}
        exporting={exporting}
      />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-neutral-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 active:text-neutral-900 p-1 -ml-1 touch-manipulation"
            aria-label="Open sidebar"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="0" y1="1" x2="18" y2="1"/>
              <line x1="0" y1="7" x2="18" y2="7"/>
              <line x1="0" y1="13" x2="18" y2="13"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-neutral-400 tracking-wide">latent</span>
        </div>
        <div className="flex-1 overflow-hidden">
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
        </div>
      </main>
      {exportBlob && (
        <ExportModal blob={exportBlob} onClose={() => setExportBlob(null)} />
      )}
      {changingPassword && (
        <ChangePasswordModal
          currentPassword={password}
          onConfirm={handleChangePassword}
          onClose={() => setChangingPassword(false)}
        />
      )}
    </div>
  );
}
