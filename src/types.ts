export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string;      // base64-encoded file contents
  size: number;
  createdAt: number;
}

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
  attachments?: Attachment[];
  updatedAt: number;
}

export type AppState =
  | { phase: "locked" }
  | { phase: "unlocked"; notes: Note[]; folders: Folder[]; password: string };
