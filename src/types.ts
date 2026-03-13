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
  parentId?: string; // one level deep only
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  folderId?: string;
  attachments?: Attachment[];
  pinned?: boolean;
  createdAt?: number; // optional for backward compat with old vaults
  updatedAt: number;
}

export type SortKey = "updated" | "created" | "title" | "manual";

export type AppState =
  | { phase: "locked" }
  | { phase: "unlocked"; notes: Note[]; folders: Folder[]; password: string };
