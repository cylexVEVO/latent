import { useEffect, useRef, useState } from "react";
import { encrypt, serializeBlobBinary } from "./crypto";
import type { AppState, Folder, Note, SortKey } from "./types";
import UnlockScreen from "./components/UnlockScreen";
import Sidebar from "./components/Sidebar";
import NoteEditor from "./components/NoteEditor";
import ExportModal from "./components/ExportModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import AttachmentGallery from "./components/AttachmentGallery";

function newNote(folderId?: string): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    tags: [],
    folderId,
    createdAt: now,
    updatedAt: now,
  };
}

function sortNotes(notes: Note[], key: SortKey): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    switch (key) {
      case "updated": return b.updatedAt - a.updatedAt;
      case "created": return (b.createdAt ?? b.updatedAt) - (a.createdAt ?? a.updatedAt);
      case "title":   return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      case "manual":  return 0;
    }
  });
}

async function writeToHandle(
  handle: FileSystemFileHandle,
  notes: Note[],
  folders: Folder[],
  password: string
) {
  const payload = { version: 2, notes, folders };
  const blob = await encrypt(JSON.stringify(payload), password);
  const bytes = serializeBlobBinary(blob);
  const writable = await handle.createWritable();
  await writable.write(bytes.buffer as ArrayBuffer);
  await writable.close();
}

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "locked" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportBlob, setExportBlob] = useState<Uint8Array | null>(null);
  const [exporting, setExporting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | "unfiled" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [searchQuery, setSearchQuery] = useState("");
  const [lockAfterMinutes, setLockAfterMinutes] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  // ── File-system auto-save ─────────────────────────────────────────────────
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  fileHandleRef.current = fileHandle;
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (state.phase !== "unlocked" || !fileHandleRef.current) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    setSaveStatus("saving");
    const handle = fileHandleRef.current;
    const { notes, folders, password } = state;
    const timer = setTimeout(() => {
      writeToHandle(handle, notes, folders, password)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 600);
    return () => clearTimeout(timer);
  }, [state]);

  // ── Beforeunload guard ────────────────────────────────────────────────────
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === "saving") e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStatus]);

  // ── Auto-lock ─────────────────────────────────────────────────────────────
  const handleLockRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (state.phase !== "unlocked" || lockAfterMinutes === 0) return;
    const ms = lockAfterMinutes * 60_000;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function resetTimer() {
      if (timerId !== null) clearTimeout(timerId);
      timerId = setTimeout(() => handleLockRef.current(), ms);
    }

    window.addEventListener("keydown", resetTimer, { passive: true });
    window.addEventListener("pointerdown", resetTimer, { passive: true });
    window.addEventListener("pointermove", resetTimer, { passive: true });
    resetTimer();

    return () => {
      if (timerId !== null) clearTimeout(timerId);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("pointermove", resetTimer);
    };
  }, [state.phase, lockAfterMinutes]);

  function handleUnlock(notes: Note[], folders: Folder[], password: string, handle?: FileSystemFileHandle) {
    setState({ phase: "unlocked", notes, folders, password });
    setSelectedId(notes[0]?.id ?? null);
    setFileHandle(handle ?? null);
    skipNextSave.current = true;
  }

  if (state.phase === "locked") {
    return <UnlockScreen onUnlock={handleUnlock} />;
  }

  const { notes, folders, password } = state;

  // ── Derive visible notes ──────────────────────────────────────────────────
  let visibleNotes = notes;

  if (activeFolderId === "unfiled") {
    visibleNotes = visibleNotes.filter((n) => !n.folderId);
  } else if (activeFolderId) {
    const subIds = new Set(folders.filter((f) => f.parentId === activeFolderId).map((f) => f.id));
    visibleNotes = visibleNotes.filter(
      (n) => n.folderId === activeFolderId || (n.folderId !== undefined && subIds.has(n.folderId))
    );
  }

  if (activeTag) {
    visibleNotes = visibleNotes.filter((n) => n.tags.includes(activeTag));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    visibleNotes = visibleNotes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }

  visibleNotes = sortNotes(visibleNotes, sortKey);

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  // ── Notes ──────────────────────────────────────────────────────────────────
  function updateNote(updated: Note) {
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, notes: s.notes.map((n) => (n.id === updated.id ? updated : n)) }
        : s
    );
  }

  function addNote(folderId?: string) {
    const n = newNote(folderId);
    setState((s) => s.phase === "unlocked" ? { ...s, notes: [n, ...s.notes] } : s);
    setSelectedId(n.id);
    setShowGallery(false);
    if (folderId) setActiveFolderId(folderId);
  }

  function deleteNote() {
    if (!selectedId) return;
    const remaining = notes.filter((n) => n.id !== selectedId);
    setState((s) => s.phase === "unlocked" ? { ...s, notes: remaining } : s);
    if (activeFolderId === "unfiled" && !remaining.some((n) => !n.folderId)) {
      setActiveFolderId(null);
    } else if (activeFolderId && activeFolderId !== "unfiled" && !remaining.some((n) => n.folderId === activeFolderId)) {
      setActiveFolderId(null);
    } else if (activeTag && !remaining.some((n) => n.tags.includes(activeTag))) {
      setActiveTag(null);
    }
    const visibleRemaining = visibleNotes.filter((n) => n.id !== selectedId);
    setSelectedId(visibleRemaining[0]?.id ?? null);
  }

  function moveNote(noteId: string, folderId: string | undefined) {
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, notes: s.notes.map((n) => n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n) }
        : s
    );
  }

  function togglePin(noteId: string) {
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, notes: s.notes.map((n) => n.id === noteId ? { ...n, pinned: !n.pinned } : n) }
        : s
    );
  }

  function reorderNote(draggedId: string, targetId: string) {
    setState((s) => {
      if (s.phase !== "unlocked") return s;
      const arr = [...s.notes];
      const fromIdx = arr.findIndex((n) => n.id === draggedId);
      if (fromIdx === -1) return s;
      const [note] = arr.splice(fromIdx, 1);
      const toIdx = arr.findIndex((n) => n.id === targetId);
      arr.splice(toIdx === -1 ? arr.length : toIdx, 0, note);
      return { ...s, notes: arr };
    });
    setSortKey("manual");
  }

  // ── Folders ────────────────────────────────────────────────────────────────
  function addFolder(name: string, parentId?: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const f: Folder = { id: crypto.randomUUID(), name: trimmed, parentId, createdAt: Date.now() };
    setState((s) => s.phase === "unlocked" ? { ...s, folders: [...s.folders, f] } : s);
  }

  function renameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) =>
      s.phase === "unlocked"
        ? { ...s, folders: s.folders.map((f) => f.id === id ? { ...f, name: trimmed } : f) }
        : s
    );
  }

  function deleteFolder(id: string) {
    setState((s) =>
      s.phase === "unlocked"
        ? {
            ...s,
            // Remove folder, orphan its children (make them root folders)
            folders: s.folders.filter((f) => f.id !== id).map((f) => f.parentId === id ? { ...f, parentId: undefined } : f),
            notes: s.notes.map((n) => n.folderId === id ? { ...n, folderId: undefined } : n),
          }
        : s
    );
    if (activeFolderId === id) setActiveFolderId(null);
  }

  // ── Vault ──────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const payload = { version: 2, notes, folders };
      const blob = await encrypt(JSON.stringify(payload), password);
      setExportBlob(serializeBlobBinary(blob));
    } finally {
      setExporting(false);
    }
  }

  function handleChangePassword(newPassword: string) {
    setState((s) => s.phase === "unlocked" ? { ...s, password: newPassword } : s);
    setChangingPassword(false);
  }

  async function handleLock() {
    if (fileHandleRef.current && state.phase === "unlocked") {
      try {
        setSaveStatus("saving");
        await writeToHandle(fileHandleRef.current, state.notes, state.folders, state.password);
      } catch {
        // proceed with lock even if save fails
      }
    }
    setState({ phase: "locked" });
    setSelectedId(null);
    setExportBlob(null);
    setActiveTag(null);
    setActiveFolderId(null);
    setFileHandle(null);
    setSaveStatus("idle");
    setSearchQuery("");
    setSortKey("updated");
    setLockAfterMinutes(0);
    setShowGallery(false);
  }

  // Keep handleLock ref current for auto-lock timer
  handleLockRef.current = handleLock;

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
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
        fileLinked={fileHandle !== null}
        saveStatus={saveStatus}
        sortKey={sortKey}
        searchQuery={searchQuery}
        lockAfterMinutes={lockAfterMinutes}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => { setSelectedId(id); setSidebarOpen(false); setShowGallery(false); }}
        onNew={addNote}
        onTagFilter={(t) => { setActiveTag((x) => (x === t ? null : t)); setSelectedId(null); }}
        onFolderSelect={(id) => { setActiveFolderId((x) => (x === id ? null : id)); setSelectedId(null); }}
        onFolderAdd={addFolder}
        onFolderRename={renameFolder}
        onFolderDelete={deleteFolder}
        onMoveNote={moveNote}
        onReorderNote={reorderNote}
        onTogglePin={togglePin}
        onSortChange={setSortKey}
        onSearchChange={setSearchQuery}
        onLockAfterMinutesChange={setLockAfterMinutes}
        onExport={handleExport}
        onLock={handleLock}
        onChangePassword={() => setChangingPassword(true)}
        onOpenGallery={() => setShowGallery(true)}
        galleryOpen={showGallery}
        exporting={exporting}
      />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 active:text-neutral-900 p-1 -ml-1 touch-manipulation"
            aria-label="Open sidebar"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-neutral-400 tracking-wide">latent</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {showGallery ? (
            <AttachmentGallery
              notes={notes}
              onClose={() => setShowGallery(false)}
              onSelectNote={(id) => { setSelectedId(id); setShowGallery(false); setSidebarOpen(false); }}
            />
          ) : selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              folders={folders}
              onChange={updateNote}
              onDelete={deleteNote}
              onMoveToFolder={(folderId) => moveNote(selected.id, folderId)}
              onTogglePin={() => togglePin(selected.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-300 text-sm">
              {notes.length === 0 ? "No notes. Hit + to start." : "Select a note."}
            </div>
          )}
        </div>
      </main>
      {exportBlob && <ExportModal blob={exportBlob} onClose={() => setExportBlob(null)} />}
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
