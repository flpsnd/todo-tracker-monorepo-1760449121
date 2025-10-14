"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Edit, Trash2, Save, X } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { authClient } from "@/lib/auth-client"
import { loadLocalNotes, saveLocalNotes, type Note } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: "", content: "" })
  const [hasInitialized, setHasInitialized] = useState(false)

  // Auth state
  const { data: session } = authClient.useSession()

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Load notes from localStorage immediately
    const localNotes = loadLocalNotes()
    setNotes(localNotes)
    setHasInitialized(true)
  }, [hasInitialized])

  const addNote = () => {
    if (!formData.title.trim() && !formData.content.trim()) return

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: formData.title.trim() || "Untitled",
      content: formData.content.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const updatedNotes = [newNote, ...notes]
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
    // Reset form
    setFormData({ title: "", content: "" })
  }

  const updateNote = (noteId: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    const updatedNotes = notes.map((note) => 
      note.id === noteId 
        ? { ...note, ...updates, updatedAt: Date.now() }
        : note
    )
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
  }

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId)
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
  }

  const startEditing = (note: Note) => {
    setEditingNote(note.id)
    setFormData({ title: note.title, content: note.content })
  }

  const saveEdit = () => {
    if (!editingNote) return
    
    updateNote(editingNote, {
      title: formData.title.trim() || "Untitled",
      content: formData.content.trim(),
    })
    
    setEditingNote(null)
    setFormData({ title: "", content: "" })
  }

  const cancelEdit = () => {
    setEditingNote(null)
    setFormData({ title: "", content: "" })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 font-mono text-2xl font-semibold hover:opacity-80 transition-opacity"
          >
            <span>Create new note</span>
            <ChevronDown className={`h-6 w-6 transition-transform duration-200 ${isFormOpen ? "rotate-180" : ""}`} />
          </button>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{session.user.email}</span>
                <button
                  onClick={() => authClient.signOut()}
                  className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm">
                Sign in
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Note Form */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="space-y-4 p-6 border border-border rounded-lg bg-card">
              <div className="space-y-4">
                <Input
                  placeholder="Enter note title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="font-mono"
                />
                <Textarea
                  placeholder="Start writing your note..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[200px] font-mono resize-none"
                />
                <div className="flex gap-2">
                  {editingNote ? (
                    <>
                      <Button onClick={saveEdit} className="font-mono">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} className="font-mono">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={addNote} className="font-mono">
                      Save Note
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-mono">No notes yet. Create your first note above.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="border border-border rounded-lg p-6 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-mono text-lg font-semibold leading-tight">
                      {note.title}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(note)}
                        className="font-mono"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="font-mono text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {truncateContent(note.content)}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>Created {formatDate(note.createdAt)}</span>
                    {note.updatedAt !== note.createdAt && (
                      <span>Updated {formatDate(note.updatedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
