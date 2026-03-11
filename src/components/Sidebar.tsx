import { useRef, useState } from "react";
import type { Folder, Note } from "../types";
import CheatSheet from "./CheatSheet";

interface Props {
  notes: Note[];        // visible (filtered) notes
  allNotes: Note[];     // all notes, for counts
  folders: Folder[];
  allTags: string[];
  activeTag: string | null;
  activeFolderId: string | "unfiled" | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: (folderId?: string) => void;
  onTagFilter: (tag: string) => void;
  onFolderSelect: (id: string | "unfiled") => void;
  onFolderAdd: (name: string) => void;
  onFolderRename: (id: string, name: string) => void;
  onFolderDelete: (id: string) => void;
  onExport: () => void;
  onLock: () => void;
  exporting: boolean;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NoteRow({ note, selected, onSelect }: { note: Note; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-2.5 border-b border-neutral-100 transition-colors cursor-pointer ${
        selected ? "bg-neutral-900 text-white" : "hover:bg-neutral-100 text-neutral-700"
      }`}
    >
      <div className="text-sm truncate font-medium">{note.title || "Untitled"}</div>
      <div className="text-xs mt-0.5 text-neutral-400 truncate">
        {formatDate(note.updatedAt)}
        {note.tags.length > 0 && <span className="ml-1 opacity-60">· {note.tags.join(", ")}</span>}
      </div>
    </button>
  );
}

export default function Sidebar({
  notes, allNotes, folders, allTags, activeTag, activeFolderId,
  selectedId, onSelect, onNew, onTagFilter, onFolderSelect,
  onFolderAdd, onFolderRename, onFolderDelete, onExport, onLock, exporting,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const newFolderRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

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

  function commitNewFolder() {
    if (newFolderName.trim()) onFolderAdd(newFolderName);
    setAddingFolder(false);
    setNewFolderName("");
  }

  function startAddFolder() {
    setAddingFolder(true);
    setNewFolderName("");
    setTimeout(() => newFolderRef.current?.focus(), 0);
  }

  const unfiledNotes = allNotes.filter((n) => !n.folderId);
  const hasFolders = folders.length > 0;

  // When no folders: show flat list from the filtered `notes` prop
  // When folders exist: show per-folder groups + unfiled
  const notesInFolder = (folderId: string) =>
    notes.filter((n) => n.folderId === folderId);
  const visibleUnfiled = notes.filter((n) => !n.folderId);

  return (
    <div className="flex flex-col h-full w-56 shrink-0 border-r border-neutral-200 bg-neutral-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Notes</span>
        <div className="flex items-center gap-2">
          <button
            onClick={startAddFolder}
            className="text-neutral-400 hover:text-neutral-900 text-xs transition-colors cursor-pointer"
            title="New folder"
          >
            + folder
          </button>
          <button
            onClick={() => onNew(activeFolderId && activeFolderId !== "unfiled" ? activeFolderId : undefined)}
            className="text-neutral-400 hover:text-neutral-900 text-lg leading-none cursor-pointer transition-colors"
            title="New note"
          >
            +
          </button>
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-b border-neutral-200 flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagFilter(tag)}
              className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeTag === tag
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Note / folder list */}
      <div className="flex-1 overflow-y-auto" onClick={() => setMenuOpenId(null)}>
        {!hasFolders && notes.length === 0 && (
          <p className="text-neutral-300 text-xs text-center mt-8 px-4">No notes yet.</p>
        )}

        {/* Flat list when no folders */}
        {!hasFolders && notes.map((n) => (
          <NoteRow key={n.id} note={n} selected={n.id === selectedId} onSelect={() => onSelect(n.id)} />
        ))}

        {/* Folder sections */}
        {hasFolders && folders.map((folder) => {
          const folderNotes = notesInFolder(folder.id);
          const isCollapsed = collapsed.has(folder.id);
          const isActive = activeFolderId === folder.id;
          const isRenaming = renamingId === folder.id;
          const menuOpen = menuOpenId === folder.id;

          return (
            <div key={folder.id}>
              {/* Folder header */}
              <div
                className={`group flex items-center gap-1 px-3 py-2 border-b border-neutral-100 ${
                  isActive ? "bg-neutral-100" : "hover:bg-neutral-100"
                }`}
              >
                {/* Chevron */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCollapsed(folder.id); }}
                  className="text-neutral-300 hover:text-neutral-600 cursor-pointer w-4 shrink-0 text-xs"
                >
                  {isCollapsed ? "›" : "›"}
                  <span className={`inline-block transition-transform ${isCollapsed ? "" : "rotate-90"}`}>›</span>
                </button>

                {/* Name / rename input */}
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 text-xs text-neutral-700 bg-transparent outline-none border-b border-neutral-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onClick={() => onFolderSelect(folder.id)}
                    className="flex-1 text-left text-xs font-medium text-neutral-600 truncate cursor-pointer"
                  >
                    {folder.name}
                    <span className="ml-1 text-neutral-300 font-normal">
                      {allNotes.filter((n) => n.folderId === folder.id).length}
                    </span>
                  </button>
                )}

                {/* Actions: + note, … menu */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onNew(folder.id); }}
                    className="text-neutral-400 hover:text-neutral-700 text-sm cursor-pointer leading-none"
                    title="New note in folder"
                  >
                    +
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : folder.id); }}
                      className="text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer px-0.5"
                    >
                      ···
                    </button>
                    {menuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded shadow-sm z-20 w-32"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => startRename(folder)}
                          className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => { onFolderDelete(folder.id); setMenuOpenId(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-50 cursor-pointer"
                        >
                          Delete folder
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes in folder */}
              {!isCollapsed && folderNotes.map((n) => (
                <div key={n.id} className="pl-3">
                  <NoteRow note={n} selected={n.id === selectedId} onSelect={() => onSelect(n.id)} />
                </div>
              ))}
            </div>
          );
        })}

        {/* New folder input */}
        {addingFolder && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-100">
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={commitNewFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewFolder();
                if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); }
              }}
              placeholder="Folder name…"
              className="flex-1 text-xs text-neutral-700 bg-transparent outline-none border-b border-neutral-400 placeholder-neutral-300"
            />
          </div>
        )}

        {/* Unfiled section (only when folders exist) */}
        {hasFolders && unfiledNotes.length > 0 && (
          <div>
            <button
              onClick={() => onFolderSelect("unfiled")}
              className={`w-full flex items-center gap-2 px-4 py-2 border-b border-neutral-100 text-left transition-colors cursor-pointer ${
                activeFolderId === "unfiled" ? "bg-neutral-100" : "hover:bg-neutral-100"
              }`}
            >
              <span className="text-xs font-medium text-neutral-400">Unfiled</span>
              <span className="text-xs text-neutral-300">{unfiledNotes.length}</span>
            </button>
            {activeFolderId === "unfiled" && visibleUnfiled.map((n) => (
              <div key={n.id} className="pl-3">
                <NoteRow note={n} selected={n.id === selectedId} onSelect={() => onSelect(n.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex-1 border border-neutral-300 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 text-xs py-1.5 rounded font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {exporting ? "Encrypting…" : "Export vault"}
          </button>
          <button
            onClick={() => setShowCheatSheet(true)}
            className="border border-neutral-300 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 text-xs w-7 h-7 rounded transition-colors cursor-pointer flex items-center justify-center"
            title="Markdown cheat sheet"
          >
            ?
          </button>
        </div>
        <button
          onClick={onLock}
          className="w-full text-neutral-400 hover:text-neutral-600 text-xs py-1.5 transition-colors cursor-pointer"
        >
          Lock &amp; clear
        </button>
      </div>

      {showCheatSheet && <CheatSheet onClose={() => setShowCheatSheet(false)} />}
    </div>
  );
}
