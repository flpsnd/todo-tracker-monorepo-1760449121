"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Eye, EyeOff, Trash2, Edit, X, ArrowLeft } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { authClient } from "@/lib/auth-client"
import { loadLocalNotes, saveLocalNotes, type Note } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [showHistory, setShowHistory] = useState(false)
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

  // Auto-save function
  const autoSave = useCallback(() => {
    if (!formData.title.trim() && !formData.content.trim()) return

    const noteData = {
      title: formData.title.trim() || "Untitled",
      content: formData.content.trim(),
      updatedAt: Date.now(),
    }

    if (currentNote) {
      // Update existing note
      const updatedNote = { ...currentNote, ...noteData }
      setCurrentNote(updatedNote)
      
      const updatedNotes = notes.map((note) => 
        note.id === currentNote.id ? updatedNote : note
      )
      setNotes(updatedNotes)
      saveLocalNotes(updatedNotes)
    } else {
      // Create new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        ...noteData,
        createdAt: Date.now(),
      }
      
      setCurrentNote(newNote)
      const updatedNotes = [newNote, ...notes]
      setNotes(updatedNotes)
      saveLocalNotes(updatedNotes)
    }
  }, [formData, currentNote, notes])

  // Auto-save on every change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSave()
    }, 500) // Debounce auto-save by 500ms

    return () => clearTimeout(timeoutId)
  }, [formData, autoSave])

  const createNewNote = () => {
    // Save current note if it has content
    if (currentNote && (formData.title.trim() || formData.content.trim())) {
      autoSave()
    }
    
    // Reset to new note
    setCurrentNote(null)
    setFormData({ title: "", content: "" })
    setShowHistory(false)
  }

  const openNote = (note: Note) => {
    setCurrentNote(note)
    setFormData({ title: note.title, content: note.content })
    setShowHistory(false)
  }

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId)
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
    // If we're viewing the deleted note, create a new one
    if (currentNote?.id === noteId) {
      setCurrentNote(null)
      setFormData({ title: "", content: "" })
    }
  }

  const startEditing = (note: Note) => {
    setEditingNote(note.id)
    setFormData({ title: note.title, content: note.content })
  }

  const saveEdit = () => {
    if (!editingNote) return
    
    const updatedNotes = notes.map((note) => 
      note.id === editingNote 
        ? { ...note, title: formData.title.trim() || "Untitled", content: formData.content.trim(), updatedAt: Date.now() }
        : note
    )
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
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
    <main className="min-h-screen bg-background">
      {/* Main writing area */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-6">
          {/* Title input */}
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="font-mono text-2xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
            placeholder="Untitled"
          />
          
          {/* Content textarea */}
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="min-h-[calc(100vh-300px)] font-mono text-base leading-relaxed border-none bg-transparent resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
            placeholder="Start writing your note..."
          />
        </div>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
            <div className="max-w-2xl mx-auto px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-xl font-semibold">Saved Notes</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowHistory(false)}
                  className="font-mono"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground font-mono">No saved notes yet.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-6 hover:bg-accent/30 transition-colors cursor-pointer group"
                      onClick={() => openNote(note)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-mono text-lg font-semibold leading-tight">
                            {note.title}
                          </h3>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(note)
                              }}
                              className="font-mono"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNote(note.id)
                              }}
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
          </div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
            <div className="max-w-2xl mx-auto px-8 py-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-xl font-semibold">Edit Note</h2>
                  <Button
                    variant="ghost"
                    onClick={cancelEdit}
                    className="font-mono"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
                
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
                  className="min-h-[300px] font-mono resize-none"
                />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} className="font-mono">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className="font-mono">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom UI */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={createNewNote}
                className="font-mono"
              >
                <Plus className="h-4 w-4 mr-2" />
                New note
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2"
                aria-label="Toggle notes history visibility"
              >
                {showHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="font-mono text-sm">{showHistory ? "Hide" : "Show"} history</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
