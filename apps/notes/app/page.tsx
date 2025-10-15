"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Eye, EyeOff, Trash2, X, ChevronLeft } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { authClient } from "@/lib/auth-client"
import { loadLocalNotes, saveLocalNotes, addDeletedNote, removeDeletedNote, getDeletedNotes, type Note } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

// Helper functions for list creation
const createUnorderedList = (divElement: HTMLElement) => {
  // Clear the trigger characters from the div first
  divElement.textContent = ''
  
  const ul = document.createElement('ul')
  const li = document.createElement('li')
  li.textContent = ''
  ul.appendChild(li)
  
  // Replace the div with the ul
  divElement.parentNode?.replaceChild(ul, divElement)
  
  // Set cursor in the new list item
  const range = document.createRange()
  const selection = window.getSelection()
  range.setStart(li, 0)
  range.setEnd(li, 0)
  selection?.removeAllRanges()
  selection?.addRange(range)
  
  // Focus the contentEditable to ensure cursor is visible
  if (ul.parentElement) {
    (ul.parentElement as HTMLElement).focus()
  }
}

const createOrderedList = (divElement: HTMLElement, startNumber: number) => {
  // Clear the trigger characters from the div first
  divElement.textContent = ''
  
  const ol = document.createElement('ol')
  ol.setAttribute('start', startNumber.toString())
  const li = document.createElement('li')
  li.textContent = ''
  ol.appendChild(li)
  
  // Replace the div with the ol
  divElement.parentNode?.replaceChild(ol, divElement)
  
  // Set cursor in the new list item
  const range = document.createRange()
  const selection = window.getSelection()
  range.setStart(li, 0)
  range.setEnd(li, 0)
  selection?.removeAllRanges()
  selection?.addRange(range)
  
  // Focus the contentEditable to ensure cursor is visible
  if (ol.parentElement) {
    (ol.parentElement as HTMLElement).focus()
  }
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [formData, setFormData] = useState({ title: "", content: "" })
  const [hasInitialized, setHasInitialized] = useState(false)
  const [deletedNotesQueue, setDeletedNotesQueue] = useState<Array<{note: Note, timeoutId: NodeJS.Timeout}>>([])
  const contentRef = useRef<HTMLDivElement>(null)

  // Auth state
  const { data: session } = authClient.useSession()
  
  // Toast hook
  const { toast } = useToast()

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
    
    // Clear contentEditable div
    if (contentRef.current) {
      contentRef.current.innerHTML = ""
    }
  }

  const openNote = (note: Note) => {
    setCurrentNote(note)
    setFormData({ title: note.title, content: note.content })
    setShowHistory(false)
    
    // Set content in contentEditable div
    if (contentRef.current) {
      contentRef.current.innerHTML = note.content
    }
  }

  const deleteNote = (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId)
    if (!noteToDelete) return
    
    // Remove from visible notes immediately
    const updatedNotes = notes.filter(note => note.id !== noteId)
    setNotes(updatedNotes)
    
    // Remove from localStorage immediately to persist deletion
    const currentNotes = loadLocalNotes()
    const filteredNotes = currentNotes.filter(n => n.id !== noteId)
    saveLocalNotes(filteredNotes)
    
    // Add to localStorage deleted notes for restore functionality
    addDeletedNote(noteToDelete)
    
    // Set 60s timeout for permanent deletion from deleted notes
    const timeoutId = setTimeout(() => {
      // Remove from deleted notes localStorage
      removeDeletedNote(noteId)
    }, 60000)
    
    // Add to deleted queue for timeout management
    setDeletedNotesQueue(prev => [...prev, { note: noteToDelete, timeoutId }])
    
    // Show toast with restore action
    toast({
      title: "Note deleted",
      description: noteToDelete.title,
      action: <ToastAction altText="Restore" onClick={() => restoreNote(noteId)}>Restore</ToastAction>,
      duration: 60000
    })
    
    // If we're viewing the deleted note, create a new one
    if (currentNote?.id === noteId) {
      setCurrentNote(null)
      setFormData({ title: "", content: "" })
      if (contentRef.current) {
        contentRef.current.innerHTML = ""
      }
    }
  }

  const restoreNote = (noteId: string) => {
    console.log("Attempting to restore note:", noteId)
    
    // Check if note is already in localStorage to prevent duplicates
    const currentLocalNotes = loadLocalNotes()
    const currentLocalNoteIds = new Set(currentLocalNotes.map(note => note.id))
    if (currentLocalNoteIds.has(noteId)) {
      console.log("Note is already restored")
      return
    }
    
    // Get deleted notes from localStorage
    const deletedNotes = getDeletedNotes()
    const deletedItem = deletedNotes.find(item => item.note.id === noteId)
    
    if (!deletedItem) {
      console.log("Note not found in deleted notes")
      return
    }
    
    console.log("Found deleted item:", deletedItem)
    
    // Clear timeout from React state
    const queueItem = deletedNotesQueue.find(item => item.note.id === noteId)
    if (queueItem) {
      clearTimeout(queueItem.timeoutId)
      setDeletedNotesQueue(prev => prev.filter(item => item.note.id !== noteId))
    }
    
    // Remove from localStorage deleted notes
    removeDeletedNote(noteId)
    
    // Add note back to localStorage since it was removed during deletion
    const updatedLocalNotes = [...currentLocalNotes, deletedItem.note]
    saveLocalNotes(updatedLocalNotes)

    // Restore note to list by reloading from localStorage to ensure consistency
    const restoredLocalNotes = loadLocalNotes()
    setNotes(restoredLocalNotes)
    
    // Show success toast
    toast({
      title: "Note restored",
      description: deletedItem.note.title,
      duration: 3000
    })
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
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '')
    if (textContent.length <= maxLength) return textContent
    return textContent.substring(0, maxLength) + "..."
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Main writing area */}
      <div className="max-w-2xl mx-auto py-8">
        <div className="space-y-6">
          {/* Title input with theme toggle */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    contentRef.current?.focus()
                  }
                }}
                className="font-mono text-2xl font-bold tracking-tight text-balance border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                placeholder="Add title"
              />
            </div>
            <ThemeToggle />
          </div>
          
          {/* Content textarea */}
          <div
            ref={contentRef}
            contentEditable
            onInput={(e) => {
              const content = e.currentTarget.innerHTML
              setFormData(prev => ({ ...prev, content }))
            }}
            onKeyDown={(e) => {
              // Handle formatting shortcuts
              if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault()
                    document.execCommand('bold')
                    break
                  case 'i':
                    e.preventDefault()
                    document.execCommand('italic')
                    break
                  case 'u':
                    e.preventDefault()
                    document.execCommand('underline')
                    break
                }
              }
              
              // Handle list shortcuts
              if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
                switch (e.key) {
                  case '8':
                    e.preventDefault()
                    document.execCommand('insertUnorderedList')
                    break
                  case '7':
                    e.preventDefault()
                    document.execCommand('insertOrderedList')
                    break
                }
              }

              // Handle automatic list creation on space key
              if (e.key === ' ') {
                const selection = window.getSelection()
                if (!selection || selection.rangeCount === 0) return
                
                const range = selection.getRangeAt(0)
                let node = range.startContainer
                
                // Get the current div element
                let divElement: HTMLElement | null = null
                if (node.nodeType === Node.TEXT_NODE) {
                  divElement = node.parentElement as HTMLElement
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  divElement = node as HTMLElement
                }
                
                // Check if we're in a div at the root level (not inside a list)
                if (divElement?.tagName === 'DIV' && 
                    divElement.parentElement === contentRef.current) {
                  
                  const text = divElement.textContent || ''
                  
                  // Check for bullet patterns: "*" or "-" at start of line
                  if (text === '*' || text === '-') {
                    e.preventDefault()
                    createUnorderedList(divElement)
                    return
                  }
                  
                  // Check for numbered pattern: "number." at start of line
                  const numberedMatch = text.match(/^(\d+)\.$/)
                  if (numberedMatch) {
                    e.preventDefault()
                    const startNumber = parseInt(numberedMatch[1])
                    createOrderedList(divElement, startNumber)
                    return
                  }
                }
              }



              // Handle Enter key for list continuation and exit
              if (e.key === 'Enter') {
                const selection = window.getSelection()
                if (!selection || selection.rangeCount === 0) return
                
                const range = selection.getRangeAt(0)
                let listItem: Node | null = range.commonAncestorContainer
                
                // Find the LI element
                while (listItem && listItem.nodeName !== 'LI') {
                  listItem = listItem.parentElement
                }
                
                // If in an empty list item, exit the list
                if (listItem && listItem.textContent?.trim() === '') {
                  e.preventDefault()
                  document.execCommand('outdent')
                  document.execCommand('formatBlock', false, 'div')
                }
                // If not in a list, let the default behavior create a new div
              }

              // Handle Escape key to exit lists
              if (e.key === 'Escape') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0)
                  const isInList = range.commonAncestorContainer.parentElement?.tagName === 'LI'
                  
                  if (isInList) {
                    e.preventDefault()
                    // Exit the list by inserting a paragraph
                    document.execCommand('insertParagraph')
                  }
                }
              }
            }}
            className="min-h-[calc(100vh-300px)] font-mono text-base leading-relaxed border-none bg-transparent resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
            style={{ outline: 'none' }}
            data-placeholder="Start writing your note..."
            suppressContentEditableWarning={true}
          />
        </div>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-8 pb-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-balance font-mono">Saved Notes</h2>
                <ThemeToggle />
              </div>
              
              <div className="space-y-8">
                {notes.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                    <p className="font-mono text-sm text-muted-foreground">No saved notes yet.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="note-item cursor-pointer group pb-5 border-b border-border"
                      onClick={() => openNote(note)}
                    >
                      <div className="space-y-2">
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
                                deleteNote(note.id)
                              }}
                              className="font-mono text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                          {truncateContent(note.content)}
                        </div>
                        
                        <div className="mt-4 text-xs text-muted-foreground font-mono">
                          <span>Updated {formatDate(note.updatedAt)}</span>
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


      {/* Sticky Bottom UI */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2"
                aria-label="Toggle notes history visibility"
              >
                {showHistory ? (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="font-mono text-sm">
                      {currentNote?.title || "Back"}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="font-mono text-sm">All notes</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={createNewNote}
                className="font-mono"
              >
                <Plus className="h-4 w-4 mr-2" />
                New note
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <Toaster />
    </main>
  )
}
