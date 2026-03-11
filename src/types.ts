export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  folderId?: string; // undefined = unfiled
  updatedAt: number;
}

export type AppState =
  | { phase: "locked" }
  | { phase: "unlocked"; notes: Note[]; folders: Folder[]; password: string };
