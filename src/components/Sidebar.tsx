import { useRef, useState } from "react";
import type { Folder, Note, SortKey } from "../types";
import CheatSheet from "./CheatSheet";

interface Props {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  allTags: string[];
  activeTag: string | null;
  activeFolderId: string | "unfiled" | null;
  selectedId: string | null;
  sidebarOpen: boolean;
  fileLinked: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  sortKey: SortKey;
  searchQuery: string;
  lockAfterMinutes: number;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: (folderId?: string) => void;
  onTagFilter: (tag: string) => void;
  onFolderSelect: (id: string | "unfiled") => void;
  onFolderAdd: (name: string, parentId?: string) => void;
  onFolderRename: (id: string, name: string) => void;
  onFolderDelete: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | undefined) => void;
  onReorderNote: (draggedId: string, targetId: string) => void;
  onTogglePin: (noteId: string) => void;
  onSortChange: (key: SortKey) => void;
  onSearchChange: (q: string) => void;
  onLockAfterMinutesChange: (m: number) => void;
  onExport: () => void;
  onLock: () => void;
  onChangePassword: () => void;
  onOpenGallery: () => void;
  galleryOpen: boolean;
  exporting: boolean;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Pin icon ──────────────────────────────────────────────────────────────────
function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

// ── Note row ──────────────────────────────────────────────────────────────────
interface NoteRowProps {
  note: Note;
  selected: boolean;
  dropIndicator: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

function NoteRow({ note, selected, dropIndicator, onSelect, onTogglePin, onDragStart, onDragEnd, onDragOver, onDrop }: NoteRowProps) {
  return (
    <div>
      {dropIndicator && <div className="h-0.5 mx-3 bg-neutral-400 dark:bg-neutral-500 rounded" />}
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
        className={`group w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 transition-colors cursor-pointer touch-manipulation flex items-start gap-2 ${
          selected
            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
        }`}
        onClick={onSelect}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate font-medium flex items-center gap-1.5">
            {note.pinned && (
              <span className={selected ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-300 dark:text-neutral-600"}>
                <PinIcon filled />
              </span>
            )}
            {note.title || "Untitled"}
          </div>
          <div className={`text-xs mt-0.5 truncate ${selected ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-400"}`}>
            {formatDate(note.updatedAt)}
            {note.tags.length > 0 && <span className="ml-1 opacity-60">· {note.tags.join(", ")}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className={`shrink-0 mt-0.5 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 ${
            note.pinned
              ? "opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-500"
          }`}
          title={note.pinned ? "Unpin" : "Pin"}
        >
          <PinIcon filled={!!note.pinned} />
        </button>
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({
  notes, allNotes, folders, allTags, activeTag, activeFolderId,
  selectedId, sidebarOpen, fileLinked, saveStatus, sortKey, searchQuery,
  lockAfterMinutes, onClose, onSelect, onNew, onTagFilter, onFolderSelect,
  onFolderAdd, onFolderRename, onFolderDelete, onMoveNote, onReorderNote,
  onTogglePin, onSortChange, onSearchChange, onLockAfterMinutesChange,
  onExport, onLock, onChangePassword, onOpenGallery, galleryOpen, exporting,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [addingSubFolderForId, setAddingSubFolderForId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // DnD state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | "unfiled" | null>(null);

  const newFolderRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function commitRename() {
    if (renamingId) onFolderRename(renamingId, renameValue);
    setRenamingId(null);
  }

  function startRename(folder: Folder) {
    setMenuOpenId(null);
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setTimeout(() => renameRef.current?.select(), 0);
  }

  function commitNewFolder(parentId?: string) {
    if (newFolderName.trim()) onFolderAdd(newFolderName, parentId);
    setAddingFolder(false);
    setAddingSubFolderForId(null);
    setNewFolderName("");
  }

  function startAddFolder(parentId?: string) {
    setMenuOpenId(null);
    setNewFolderName("");
    if (parentId) {
      setAddingSubFolderForId(parentId);
    } else {
      setAddingFolder(true);
    }
    setTimeout(() => newFolderRef.current?.focus(), 0);
  }

  // DnD helpers
  function clearDrag() {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragOverFolderId(null);
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string | "unfiled") {
    if (!draggedNoteId) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
    setDragOverNoteId(null);
  }

  function handleFolderDrop(e: React.DragEvent, folderId: string | "unfiled") {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNoteId) onMoveNote(draggedNoteId, folderId === "unfiled" ? undefined : folderId);
    clearDrag();
  }

  function handleNoteDragOver(e: React.DragEvent, noteId: string) {
    if (!draggedNoteId || draggedNoteId === noteId) return;
    e.preventDefault();
    setDragOverNoteId(noteId);
    setDragOverFolderId(null);
  }

  function handleNoteDrop(noteId: string) {
    if (draggedNoteId && draggedNoteId !== noteId) onReorderNote(draggedNoteId, noteId);
    clearDrag();
  }

  const rootFolders = folders.filter((f) => !f.parentId);
  const subFoldersOf = (parentId: string) => folders.filter((f) => f.parentId === parentId);
  const notesInFolder = (folderId: string) => notes.filter((n) => n.folderId === folderId);
  const unfiledNotes = allNotes.filter((n) => !n.folderId);
  const visibleUnfiled = notes.filter((n) => !n.folderId);
  const hasFolders = folders.length > 0;

  const folderDragHighlight = "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600";

  // ── Folder header renderer ────────────────────────────────────────────────
  function renderFolderHeader(folder: Folder, indent: boolean) {
    const isCollapsedF = collapsed.has(folder.id);
    const isActive = activeFolderId === folder.id;
    const isRenaming = renamingId === folder.id;
    const menuOpen = menuOpenId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;
    const noteCount = allNotes.filter((n) => n.folderId === folder.id).length;
    const isRoot = !folder.parentId;

    return (
      <div
        className={`group flex items-center gap-1 px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer select-none transition-colors ${
          isDragOver ? folderDragHighlight : isActive ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        onClick={() => { toggleCollapsed(folder.id); onFolderSelect(folder.id); }}
        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => handleFolderDrop(e, folder.id)}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform ${isCollapsedF ? "" : "rotate-90"}`}
        >
          <polyline points="3,2 7,5 3,8" />
        </svg>

        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
            className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-none border-b border-neutral-400 dark:border-neutral-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-left text-xs font-medium truncate ${indent ? "text-neutral-500 dark:text-neutral-500" : "text-neutral-600 dark:text-neutral-400"}`}>
            {folder.name}
            <span className="ml-1 text-neutral-300 dark:text-neutral-600 font-normal">{noteCount}</span>
          </span>
        )}

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onNew(folder.id); }}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm cursor-pointer leading-none p-1 touch-manipulation"
            title="New note in folder"
          >+</button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : folder.id); }}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs cursor-pointer px-1 py-1 touch-manipulation"
            >···</button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm z-20 w-36"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => startRename(folder)} className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer">Rename</button>
                {isRoot && (
                  <button onClick={() => startAddFolder(folder.id)} className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer">New subfolder</button>
                )}
                <button onClick={() => { onFolderDelete(folder.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer">Delete folder</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0 w-72 md:w-56 fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Notes</span>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setAddMenuOpen((o) => !o); }}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 text-lg leading-none cursor-pointer transition-colors p-1 touch-manipulation"
              title="New…"
            >+</button>
            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm z-20 w-36" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setAddMenuOpen(false); onNew(activeFolderId && activeFolderId !== "unfiled" ? activeFolderId : undefined); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                >New note</button>
                <button
                  onClick={() => { setAddMenuOpen(false); startAddFolder(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                >New folder</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="md:hidden text-neutral-400 active:text-neutral-900 dark:active:text-neutral-100 text-lg leading-none cursor-pointer p-1 touch-manipulation" aria-label="Close sidebar">×</button>
        </div>
      </div>

      {/* Gallery row */}
      <button
        onClick={onOpenGallery}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-left transition-colors cursor-pointer ${
          galleryOpen
            ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-xs font-medium">Attachments</span>
      </button>

      {/* Search + sort */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1">
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="w-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-600 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 pr-6"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 text-sm cursor-pointer leading-none">×</button>
          )}
        </div>
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="text-xs bg-transparent text-neutral-400 dark:text-neutral-500 outline-none cursor-pointer border-none shrink-0"
          title="Sort order"
        >
          <option value="updated">Updated</option>
          <option value="created">Created</option>
          <option value="title">Title</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagFilter(tag)}
              className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeTag === tag
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600"
              }`}
            >{tag}</button>
          ))}
        </div>
      )}

      {/* Note/folder list */}
      <div className="flex-1 overflow-y-auto" onClick={() => { setMenuOpenId(null); setAddMenuOpen(false); setMoreMenuOpen(false); }}>
        {!hasFolders && notes.length === 0 && (
          <p className="text-neutral-300 dark:text-neutral-600 text-xs text-center mt-8 px-4">
            {searchQuery ? "No results." : "No notes yet."}
          </p>
        )}

        {/* Flat list when no folders */}
        {!hasFolders && notes.map((n) => (
          <NoteRow
            key={n.id} note={n} selected={n.id === selectedId && !galleryOpen}
            dropIndicator={dragOverNoteId === n.id}
            onSelect={() => onSelect(n.id)}
            onTogglePin={() => onTogglePin(n.id)}
            onDragStart={() => setDraggedNoteId(n.id)}
            onDragEnd={clearDrag}
            onDragOver={(e) => handleNoteDragOver(e, n.id)}
            onDrop={() => handleNoteDrop(n.id)}
          />
        ))}

        {/* Folder sections */}
        {hasFolders && rootFolders.map((folder) => {
          const isCollapsedF = collapsed.has(folder.id);
          const children = subFoldersOf(folder.id);
          const directNotes = notesInFolder(folder.id);

          return (
            <div key={folder.id}>
              {renderFolderHeader(folder, false)}

              {!isCollapsedF && (
                <>
                  {/* Sub-folders */}
                  {children.map((sub) => {
                    const isCollapsedS = collapsed.has(sub.id);
                    const subNotes = notesInFolder(sub.id);
                    const isDragOverSub = dragOverFolderId === sub.id;
                    return (
                      <div key={sub.id} className="pl-3 border-l border-neutral-100 dark:border-neutral-800 ml-3">
                        <div
                          className={`transition-colors ${isDragOverSub ? folderDragHighlight : ""}`}
                          onDragOver={(e) => handleFolderDragOver(e, sub.id)}
                          onDragLeave={() => setDragOverFolderId(null)}
                          onDrop={(e) => handleFolderDrop(e, sub.id)}
                        >
                          {renderFolderHeader(sub, true)}
                        </div>

                        {!isCollapsedS && subNotes.map((n) => (
                          <NoteRow
                            key={n.id} note={n} selected={n.id === selectedId && !galleryOpen}
                            dropIndicator={dragOverNoteId === n.id}
                            onSelect={() => onSelect(n.id)}
                            onTogglePin={() => onTogglePin(n.id)}
                            onDragStart={() => setDraggedNoteId(n.id)}
                            onDragEnd={clearDrag}
                            onDragOver={(e) => handleNoteDragOver(e, n.id)}
                            onDrop={() => handleNoteDrop(n.id)}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* Sub-folder new input (for root folder) */}
                  {addingSubFolderForId === folder.id && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 pl-7">
                      <input ref={newFolderRef} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={() => commitNewFolder(folder.id)} onKeyDown={(e) => { if (e.key === "Enter") commitNewFolder(folder.id); if (e.key === "Escape") { setAddingSubFolderForId(null); setNewFolderName(""); } }} placeholder="Subfolder name…" className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-none border-b border-neutral-400 dark:border-neutral-500 placeholder-neutral-300 dark:placeholder-neutral-600" />
                    </div>
                  )}

                  {/* Direct notes in root folder */}
                  {directNotes.map((n) => (
                    <NoteRow
                      key={n.id} note={n} selected={n.id === selectedId && !galleryOpen}
                      dropIndicator={dragOverNoteId === n.id}
                      onSelect={() => onSelect(n.id)}
                      onTogglePin={() => onTogglePin(n.id)}
                      onDragStart={() => setDraggedNoteId(n.id)}
                      onDragEnd={clearDrag}
                      onDragOver={(e) => handleNoteDragOver(e, n.id)}
                      onDrop={() => handleNoteDrop(n.id)}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}

        {/* New root folder input */}
        {addingFolder && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
            <input ref={newFolderRef} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={() => commitNewFolder()} onKeyDown={(e) => { if (e.key === "Enter") commitNewFolder(); if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); } }} placeholder="Folder name…" className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-none border-b border-neutral-400 dark:border-neutral-500 placeholder-neutral-300 dark:placeholder-neutral-600" />
          </div>
        )}

        {/* Unfiled */}
        {hasFolders && (unfiledNotes.length > 0 || activeFolderId === "unfiled") && (
          <div>
            <button
              onClick={() => onFolderSelect("unfiled")}
              onDragOver={(e) => handleFolderDragOver(e, "unfiled")}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleFolderDrop(e, "unfiled")}
              className={`w-full flex items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 text-left transition-colors cursor-pointer ${
                dragOverFolderId === "unfiled" ? folderDragHighlight : activeFolderId === "unfiled" ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Unfiled</span>
              <span className="text-xs text-neutral-300 dark:text-neutral-600">{unfiledNotes.length}</span>
            </button>
            {activeFolderId === "unfiled" && visibleUnfiled.map((n) => (
              <div key={n.id} className="pl-3">
                <NoteRow
                  note={n} selected={n.id === selectedId && !galleryOpen}
                  dropIndicator={dragOverNoteId === n.id}
                  onSelect={() => onSelect(n.id)}
                  onTogglePin={() => onTogglePin(n.id)}
                  onDragStart={() => setDraggedNoteId(n.id)}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => handleNoteDragOver(e, n.id)}
                  onDrop={() => handleNoteDrop(n.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={onLock}
            className="flex-1 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs py-1.5 rounded font-medium transition-colors cursor-pointer"
          >
            Lock
          </button>
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen((o) => !o)}
              className="border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 text-xs py-1.5 px-2.5 rounded transition-colors cursor-pointer flex items-center justify-center"
              title="More"
            >···</button>
            {moreMenuOpen && (
              <div
                className="absolute bottom-full mb-1 right-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm z-20 w-48"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setMoreMenuOpen(false); setShowCheatSheet(true); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                >Markdown guide</button>
                <div className="flex items-center justify-between px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">Auto-lock</span>
                  <select
                    value={lockAfterMinutes}
                    onChange={(e) => onLockAfterMinutesChange(Number(e.target.value))}
                    className="text-xs bg-transparent text-neutral-500 dark:text-neutral-400 outline-none cursor-pointer border-none"
                  >
                    <option value={0}>Off</option>
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
                <div className="border-t border-neutral-100 dark:border-neutral-700" />
                <button
                  onClick={() => { setMoreMenuOpen(false); onExport(); }}
                  disabled={exporting}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >{exporting ? "Encrypting…" : "Export vault"}</button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onChangePassword(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                >Change password</button>
              </div>
            )}
          </div>
        </div>
        {fileLinked && (
          <p className="text-xs text-neutral-300 dark:text-neutral-600 text-right mt-1.5 h-3.5">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Save failed"}
          </p>
        )}
      </div>

      {showCheatSheet && <CheatSheet onClose={() => setShowCheatSheet(false)} />}
    </div>
  );
}
