# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint
npm run preview    # preview production build
npx tsc --noEmit   # type-check only (no output)
```

No test suite is set up.

## Architecture

Client-only React app — no backend, no localStorage, no network calls. All note data lives in React state and is only persisted via an exported encrypted blob that the user saves manually.

### Encryption (`src/crypto.ts`)
All crypto uses the Web Crypto API. PBKDF2 (310k iterations, SHA-256) derives a 256-bit AES-GCM key from the user's password. Each export generates a fresh random salt + IV. The serialized vault is base64(JSON({salt, iv, ct})).

**Vault format** (written by `App.tsx`, parsed by `UnlockScreen.tsx`):
- v2 (current): `{ version: 2, notes: Note[], folders: Folder[] }`
- legacy: plain `Note[]` array — `parseVault()` in UnlockScreen detects and upgrades transparently

### State (`src/App.tsx`)
Single `AppState` discriminated union: `{ phase: "locked" }` or `{ phase: "unlocked", notes, folders, password }`. All mutations are pure setState calls — no reducers. `App.tsx` owns all business logic (add/delete/move notes, add/rename/delete folders) and passes handlers down as props.

Two independent filter axes — `activeTag` and `activeFolderId` — are applied in sequence to produce the `visibleNotes` prop passed to Sidebar.

### Editor (`src/editor/`)
The note body uses CodeMirror 6 (not a textarea). Two files:
- `markdownPlugin.ts` — a `ViewPlugin` that walks the lezer syntax tree on every doc/selection/viewport change. Emits mark decorations (CSS classes for bold, italic, headings, etc.) and replace decorations (hides syntax markers like `**` when the cursor is off that line). Replace decorations are guarded against overlap.
- `theme.ts` — `EditorView.theme()` defining all `.cm-md-*` CSS rules used by the plugin.

`MarkdownEditor.tsx` wraps CM6 in a React component. It initializes the `EditorView` once on mount (empty deps `[]`) and uses a ref for the `onChange` callback to avoid stale closures. The parent passes `key={note.id}` on `NoteEditor` to force a full remount when switching notes — this is intentional.

### Sidebar folder UX
Folder collapse/rename/menu state is all local to `Sidebar.tsx` (no lifting needed — it's ephemeral UI state). When folders exist, notes are grouped into per-folder sections + an "Unfiled" section. When no folders exist, notes render as a flat list (same as the original design).
