export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface DeletedNote {
  note: Note;
  deletedAt: number;
  timeoutId?: number;
}

const STORAGE_KEY = "notes-local";
const DELETED_NOTES_KEY = "notes-deleted-notes";

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

export function getDeletedNotes(): DeletedNote[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(DELETED_NOTES_KEY);
    const deletedNotes = data ? JSON.parse(data) : [];
    
    // Clean up expired notes (older than 60 seconds)
    const now = Date.now();
    const validNotes = deletedNotes.filter((deletedNote: DeletedNote) => {
      return now - deletedNote.deletedAt < 60000; // 60 seconds
    });
    
    // Update localStorage if we removed expired notes
    if (validNotes.length !== deletedNotes.length) {
      localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(validNotes));
    }
    
    return validNotes;
  } catch (error) {
    console.error("Failed to load deleted notes:", error);
    return [];
  }
}

export function addDeletedNote(note: Note): void {
  if (typeof window === "undefined") return;
  try {
    const deletedNotes = getDeletedNotes();
    const deletedNote: DeletedNote = {
      note,
      deletedAt: Date.now(),
    };
    
    deletedNotes.push(deletedNote);
    localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(deletedNotes));
  } catch (error) {
    console.error("Failed to add deleted note:", error);
  }
}

export function removeDeletedNote(noteId: string): void {
  if (typeof window === "undefined") return;
  try {
    const deletedNotes = getDeletedNotes();
    const filteredNotes = deletedNotes.filter((deletedNote: DeletedNote) => 
      deletedNote.note.id !== noteId
    );
    localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(filteredNotes));
  } catch (error) {
    console.error("Failed to remove deleted note:", error);
  }
}

export function clearDeletedNotes(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DELETED_NOTES_KEY);
  } catch (error) {
    console.error("Failed to clear deleted notes:", error);
  }
}

