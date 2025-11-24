"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Eye, Trash2, ChevronLeft } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useSession } from "@/lib/auth-client"
import { useJournalNotes } from "@/lib/convex-query-adapter"
import { loadLocalNotes, saveLocalNotes, addDeletedNote, removeDeletedNote, getDeletedNotes, saveCurrentNoteId, loadCurrentNoteId, type Note } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthButton } from "@/components/auth-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [isMigrating, setIsMigrating] = useState(false)
  const [deletedNotesQueue, setDeletedNotesQueue] = useState<Array<{note: Note, timeoutId: NodeJS.Timeout}>>([])
  const contentRef = useRef<HTMLDivElement>(null)
  const prevNotesSerializedRef = useRef<string>("")

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusMode') === 'true'
    }
    return false
  })

  // Auth state - using Better Auth session
  const { data: session, isPending } = useSession()
  const hasSession = Boolean(session?.user)
  const isAuthenticated = hasSession
  const isLoading = isPending
  
  // Use the adapter hook that combines Convex realtime with TanStack Query caching
  const { notes: notesFromAdapter, isRealtime } = useJournalNotes()
  
  // Create a ref to track notes from adapter for deletion checks
  const notesFromAdapterRef = useRef<Note[]>([])
  useEffect(() => {
    notesFromAdapterRef.current = notesFromAdapter
  }, [notesFromAdapter])

  // Convex mutations
  const addNoteMutation = useMutation(api.journalNotes.addJournalNote)
  const updateNoteMutation = useMutation(api.journalNotes.updateJournalNote)
  const deleteNoteMutation = useMutation(api.journalNotes.deleteJournalNote)
  const syncLocalNotesMutation = useMutation(api.journalNotes.syncLocalJournalNotes)
  
  // Toast hook
  const { toast } = useToast()

  // Focus mode persistence
  useEffect(() => {
    localStorage.setItem('focusMode', isFocusMode.toString())
  }, [isFocusMode])

  // Focus mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsFocusMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Update notes when adapter data changes (handles both cached and live data)
  useEffect(() => {
    if (!hasInitialized || isMigrating) return

    // Update notes when adapter data changes (handles both cached and live data)
    if (notesFromAdapter.length > 0 || (isAuthenticated && isRealtime)) {
      // Create a comprehensive serialization to compare all note data
      const sortedNotes = [...notesFromAdapter].sort((a, b) => b.updatedAt - a.updatedAt)
      const currentSerialized = JSON.stringify(
        sortedNotes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        }))
      )
        
      // Only update if the data has actually changed
      if (prevNotesSerializedRef.current !== currentSerialized) {
        prevNotesSerializedRef.current = currentSerialized
        setNotes(notesFromAdapter)
        // Only save to localStorage if we have actual notes (don't overwrite backup with empty array)
        // localStorage serves as an offline backup and should not lose data
        if (notesFromAdapter.length > 0) {
          saveLocalNotes(notesFromAdapter)
        }
      }
    }
  }, [notesFromAdapter, isAuthenticated, isRealtime, isMigrating, hasInitialized])

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Only initialize after auth state is determined
    if (isLoading) return // Wait for auth to load
    
    // Only load local notes if not authenticated (to avoid overriding Convex data)
    if (!isAuthenticated) {
    const localNotes = loadLocalNotes()
    setNotes(localNotes)
    
    // Try to restore the current note
    const currentNoteId = loadCurrentNoteId()
    if (currentNoteId) {
      const noteToRestore = localNotes.find(note => note.id === currentNoteId)
      if (noteToRestore) {
        setCurrentNote(noteToRestore)
        setFormData({ title: noteToRestore.title, content: noteToRestore.content })
        
        // Set content in contentEditable div
        if (contentRef.current) {
          contentRef.current.innerHTML = noteToRestore.content
        }
      }
    }
    }
    // If authenticated, notes will come from the adapter (cached or live)
    setHasInitialized(true)
  }, [hasInitialized, isAuthenticated, isLoading])

  // Migration effect - runs once when user first authenticates
  useEffect(() => {
    if (!hasSession || isLoading || !hasInitialized || isMigrating) return

    const userId = session?.user?.id ?? session?.user?.email
    if (!userId) return

    const migrationFlagKey = `notes:migrated:${userId}`
    const migrationFlag = typeof window !== "undefined" ? localStorage.getItem(migrationFlagKey) : null
    if (migrationFlag === "true") return

    // Set migration flag BEFORE loading notes to prevent race conditions
    // This prevents autoSave from creating notes during migration
    setIsMigrating(true)

    // Capture current React state notes before loading from localStorage
    // This allows us to merge any notes created during the brief window before isMigrating was set
    const currentStateNotes = notes

    const localNotes = loadLocalNotes()
    if (localNotes.length === 0) {
      localStorage.setItem(migrationFlagKey, "true")
      setIsMigrating(false)
      return
    }

    syncLocalNotesMutation({
      notes: localNotes.map((note) => ({
        id: note.id, // Local UUID used as clientId
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
    })
      .then((idMapping) => {
        // Update local notes with Convex IDs using the mapping
        const updatedLocalNotes = localNotes.map((note) => {
          const convexId = idMapping[note.id]
          if (convexId) {
            return { ...note, id: convexId } // Replace local UUID with Convex ID
          }
          return note
        })
        
        // Merge with any notes that were created in React state during migration
        // These are notes that were created after localNotes was loaded but before isMigrating was set
        const notesCreatedDuringMigration = currentStateNotes.filter(
          (stateNote) => !localNotes.some((localNote) => localNote.id === stateNote.id)
        )
        
        // Combine migrated notes with notes created during migration
        const finalNotes = [...updatedLocalNotes, ...notesCreatedDuringMigration]
        
        // Save updated notes with Convex IDs
        saveLocalNotes(finalNotes)
        
        // Update current note if it was migrated
        if (currentNote) {
          const convexId = idMapping[currentNote.id]
          if (convexId) {
            setCurrentNote({ ...currentNote, id: convexId })
            saveCurrentNoteId(convexId)
          }
        }
        
        // Update notes state with merged notes
        setNotes(finalNotes)
        
        localStorage.setItem(migrationFlagKey, "true")
        setIsMigrating(false)
        toast({
          title: "Notes synced",
          description: "Your notes have been synced to the cloud.",
        })
      })
      .catch((error) => {
        console.error("Migration failed", error)
        setIsMigrating(false)
        toast({
          title: "Sync Error",
          description: "Failed to sync notes. You can retry by signing in again.",
          variant: "destructive",
        })
      })
  }, [hasSession, isLoading, hasInitialized, syncLocalNotesMutation, session, toast, isMigrating, notes, currentNote])

  // Auto-save function
  const autoSave = useCallback(async () => {
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
      
      // Save current note ID
      saveCurrentNoteId(updatedNote.id)

      // Sync to Convex if authenticated
      // Check if note exists in Convex by checking if it's in the adapter notes
      if (isAuthenticated) {
        const noteInConvex = notesFromAdapterRef.current.find(n => n.id === currentNote.id)
        if (noteInConvex) {
          try {
            await updateNoteMutation({
              id: currentNote.id as Id<"journalNotes">,
              title: updatedNote.title,
              content: updatedNote.content,
              updatedAt: updatedNote.updatedAt,
            })
          } catch (error) {
            console.error("Failed to update note in Convex:", error)
          }
        }
      }
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
      
      // Save current note ID
      saveCurrentNoteId(newNote.id)

      // Sync to Convex if authenticated
      if (isAuthenticated) {
        try {
          const convexId = await addNoteMutation({
            title: newNote.title,
            content: newNote.content,
            clientId: newNote.id, // Store local UUID as clientId for future reference
            createdAt: newNote.createdAt,
            updatedAt: newNote.updatedAt,
          })
          // Update note with Convex ID - replace local UUID with Convex ID
          const noteWithConvexId = { ...newNote, id: convexId }
          setCurrentNote(noteWithConvexId)
          const updatedNotesWithConvexId = updatedNotes.map(n => 
            n.id === newNote.id ? noteWithConvexId : n
          )
          setNotes(updatedNotesWithConvexId)
          saveLocalNotes(updatedNotesWithConvexId)
          saveCurrentNoteId(convexId)
        } catch (error) {
          console.error("Failed to add note to Convex:", error)
        }
      }
    }
  }, [formData, currentNote, notes, isAuthenticated, addNoteMutation, updateNoteMutation])

  // Auto-save on every change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSave()
    }, 500) // Debounce auto-save by 500ms

    return () => clearTimeout(timeoutId)
  }, [formData, autoSave])

  // Update browser tab title based on current note
  useEffect(() => {
    if (currentNote && currentNote.title && currentNote.title !== "Untitled") {
      document.title = currentNote.title
    } else {
      document.title = "Journal"
    }
  }, [currentNote])

  const createNewNote = () => {
    // Save current note if it has content
    if (currentNote && (formData.title.trim() || formData.content.trim())) {
      autoSave()
    }
    
    // Reset to new note
    setCurrentNote(null)
    setFormData({ title: "", content: "" })
    setShowHistory(false)
    
    // Clear current note ID from localStorage
    saveCurrentNoteId(null)
    
    // Clear contentEditable div
    if (contentRef.current) {
      contentRef.current.innerHTML = ""
    }
  }

  const openNote = (note: Note) => {
    setCurrentNote(note)
    setFormData({ title: note.title, content: note.content })
    setShowHistory(false)
    
    // Save current note ID
    saveCurrentNoteId(note.id)
    
    // Set content in contentEditable div
    if (contentRef.current) {
      contentRef.current.innerHTML = note.content
    }
  }

  const deleteNote = async (noteId: string) => {
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
    
    // Delete from Convex if authenticated
    // Check if note exists in Convex by checking if it's in the adapter notes
    if (isAuthenticated) {
      const noteInConvex = notesFromAdapterRef.current.find(n => n.id === noteId)
      if (noteInConvex) {
        try {
          await deleteNoteMutation({ id: noteId as Id<"journalNotes"> })
        } catch (error) {
          console.error("Failed to delete note from Convex:", error)
        }
      }
    }
    
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
    if (typeof window === 'undefined') {
      // Server-side: simple regex strip
      const textContent = content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ')
      const cleaned = textContent.replace(/\s+/g, ' ').trim()
      if (cleaned.length <= maxLength) return cleaned
      return cleaned.substring(0, maxLength) + "..."
    }
    
    // Client-side: use DOM parsing for better accuracy
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const textContent = tempDiv.textContent || tempDiv.innerText || ''
    // Clean up any remaining HTML entities and normalize whitespace
    const cleaned = textContent.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.substring(0, maxLength) + "..."
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
            <div 
              className={`flex items-center gap-2 transition-transform duration-300 ease-in-out ${
                isFocusMode ? '-translate-y-[200%]' : 'translate-y-0'
              }`}
            >
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
          
          {/* Content textarea */}
          <div
            ref={contentRef}
            contentEditable
            onInput={(e) => {
              const content = e.currentTarget.innerHTML
              setFormData(prev => ({ ...prev, content }))
              
              // Check for list patterns after input with a small delay
              setTimeout(() => {
                const selection = window.getSelection()
                if (!selection || selection.rangeCount === 0) return
                
                const range = selection.getRangeAt(0)
                const node = range.startContainer
                
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
                  
                  // Check for bullet patterns: "* " or "- " (with space)
                  const bulletMatch = text.match(/^[\*\-]\s$/)
                  if (bulletMatch) {
                    createUnorderedList(divElement)
                    return
                  }
                  
                  // Check for numbered pattern: "number. " (with space)
                  const numberedMatch = text.match(/^(\d+)\.\s$/)
                  if (numberedMatch) {
                    const startNumber = parseInt(numberedMatch[1])
                    createOrderedList(divElement, startNumber)
                    return
                  }
                }
              }, 10) // Small delay to ensure DOM is updated
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
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
            <div className="max-w-2xl mx-auto py-8 pb-[200px]">
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
                  notes.map((note, index) => (
                    <div
                      key={note.id}
                      className={`note-item cursor-pointer group pb-5 ${index < notes.length - 1 ? 'border-b border-border' : ''}`}
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
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50 transition-transform duration-300 ease-in-out ${
          isFocusMode ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
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
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <Toaster />
    </main>
  )
}
