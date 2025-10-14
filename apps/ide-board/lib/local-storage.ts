export interface Note {
  id: string
  _id?: string // Convex ID
  content: string
  color: string
  x: number
  y: number
}

const STORAGE_KEY = "ide-board-notes-local";

export function loadLocalNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load local notes:", error);
    return [];
  }
}

export function saveLocalNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to save local notes:", error);
  }
}

export function clearLocalNotes(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear local notes:", error);
  }
}