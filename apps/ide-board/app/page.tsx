"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { loadLocalNotes, saveLocalNotes, Note, addDeletedNote, removeDeletedNote, getDeletedNotes } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { StickyNote } from "../components/sticky-note"
import { NoteForm } from "../components/note-form"
import { ErrorBoundary } from "../components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

// Temporary API object until Convex generates types
const api = {
  notes: {
    getNotes: "notes:getNotes" as any,
    addNote: "notes:addNote" as any,
    updateNote: "notes:updateNote" as any,
    deleteNote: "notes:deleteNote" as any,
    syncLocalNotes: "notes:syncLocalNotes" as any,
  }
}

const COLORS = [
  { name: "Red", value: "#ffb3ba", textColor: "#000000" },
  { name: "Orange", value: "#ffdfba", textColor: "#000000" },
  { name: "Yellow", value: "#ffffba", textColor: "#000000" },
  { name: "Green", value: "#baffc9", textColor: "#000000" },
  { name: "Blue", value: "#bae1ff", textColor: "#000000" },
  { name: "Purple", value: "#e0bbff", textColor: "#000000" },
  { name: "White", value: "#ffffff", textColor: "#000000" },
  { name: "Black", value: "#000000", textColor: "#ffffff" },
]

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [viewportX, setViewportX] = useState(0)
  const [viewportY, setViewportY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"local-only" | "syncing" | "synced" | "error">("local-only")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [deletedNotesQueue, setDeletedNotesQueue] = useState<Array<{note: Note, timeoutId: NodeJS.Timeout}>>([])
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastPanRef = useRef({ x: 0, y: 0 })

  // Auth state
  const { data: session } = authClient.useSession()
  
  // Toast hook
  const { toast } = useToast()
  
  // Convex queries and mutations (only available when Convex is configured)
  let convexNotes: any[] | undefined = undefined
  let addNoteMutation: any = null
  let updateNoteMutation: any = null
  let deleteNoteMutation: any = null
  let syncLocalNotesMutation: any = null

  try {
    convexNotes = useQuery(api.notes.getNotes as any)
    addNoteMutation = useMutation(api.notes.addNote as any)
    updateNoteMutation = useMutation(api.notes.updateNote as any)
    deleteNoteMutation = useMutation(api.notes.deleteNote as any)
    syncLocalNotesMutation = useMutation(api.notes.syncLocalNotes as any)
  } catch (error) {
    // Convex not available during build or when not configured
    console.warn("Convex not available:", error)
    // Ensure convexNotes is always an array to prevent crashes
    convexNotes = []
  }

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Load notes from localStorage immediately
    const localNotes = loadLocalNotes()
    setNotes(localNotes)
    setHasInitialized(true)

    // If user is authenticated and Convex is available, sync with Convex
    if (session?.user && convexNotes !== undefined) {
      handleSyncWithConvex()
    }
  }, [session, convexNotes, hasInitialized])

  // Handle Convex reconnection - sync when convexNotes becomes available again
  useEffect(() => {
    if (hasInitialized && session?.user) {
      if (convexNotes === undefined) {
        setIsReconnecting(true)
      } else {
        setIsReconnecting(false)
        handleSyncWithConvex()
      }
    }
  }, [convexNotes])

  // Handle sync with Convex when user signs in
  const handleSyncWithConvex = async () => {
    if (!session?.user || convexNotes === undefined || !syncLocalNotesMutation) return

    setSyncStatus("syncing")
    try {
      // Ensure convexNotes is an array before accessing .length
      const convexNotesArray = Array.isArray(convexNotes) ? convexNotes : []
      
      // If we have local notes and no Convex notes, upload local notes
      if (notes.length > 0 && convexNotesArray.length === 0) {
        await syncLocalNotesMutation({
          notes: notes.map((note: Note) => ({
            content: note.content,
            color: note.color,
            x: note.x,
            y: note.y,
            rotation: note.rotation,
          }))
        })
      }
      
      // Update local state with Convex notes
      if (convexNotesArray.length > 0) {
        const convexNotesFormatted = convexNotesArray.map((note: any) => ({
          id: note._id, // Use Convex ID as the main ID
          _id: note._id, // Also store as _id for Convex operations
          content: note.content,
          color: note.color,
          x: note.x,
          y: note.y,
          rotation: note.rotation || 0,
        }))
        setNotes(convexNotesFormatted)
        saveLocalNotes(convexNotesFormatted)
      }
      
      setSyncStatus("synced")
    } catch (error) {
      console.error("Sync error:", error)
      setSyncStatus("error")
    }
  }

  const addNote = async (note: Omit<Note, "id" | "x" | "y" | "rotation">) => {
    // Position new note at the center of the current viewport in world coordinates
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    
    const centerX = viewportX + (canvasRect.width / 2) / zoom - 100
    const centerY = viewportY + (canvasRect.height / 2) / zoom - 100
    
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      x: centerX,
      y: centerY,
      rotation: 0,
    }
    
    // Update local state immediately - ensure notes is an array
    const currentNotes = Array.isArray(notes) ? notes : []
    const updatedNotes = [...currentNotes, newNote]
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
    // If authenticated, also save to Convex
    if (session?.user && addNoteMutation) {
      try {
        setSyncStatus("syncing")
        await addNoteMutation({
          content: newNote.content,
          color: newNote.color,
          x: newNote.x,
          y: newNote.y,
          rotation: newNote.rotation,
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync note:", error)
        setSyncStatus("error")
      }
    }
  }

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!Array.isArray(notes)) return
    
    const updatedNotes = notes.map((note) => (note.id === noteId ? { ...note, ...updates } : note))
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
    // If authenticated, sync to Convex
    if (session?.user && updateNoteMutation) {
      try {
        setSyncStatus("syncing")
        const note = notes.find(n => n.id === noteId)
        // Only sync if this is a Convex note (has _id field)
        if (note?._id) {
          await updateNoteMutation({
            noteId: note._id,
            ...updates,
          })
        }
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync note update:", error)
        setSyncStatus("error")
      }
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!Array.isArray(notes)) return
    
    const noteToDelete = notes.find(n => n.id === noteId)
    if (!noteToDelete) return
    
    // Remove from visible notes immediately
    const updatedNotes = notes.filter(n => n.id !== noteId)
    setNotes(updatedNotes)
    
    // Remove from localStorage immediately to persist deletion
    const currentNotes = loadLocalNotes()
    const filteredNotes = currentNotes.filter(n => n.id !== noteId)
    saveLocalNotes(filteredNotes)
    
    // Add to localStorage deleted notes for restore functionality
    addDeletedNote(noteToDelete)
    
    // Set 60s timeout for permanent deletion from deleted notes and Convex
    const timeoutId = setTimeout(() => {
      // Remove from deleted notes localStorage
      removeDeletedNote(noteId)
      
      // Permanently delete from Convex if authenticated
      if (session?.user && noteToDelete._id) {
        deleteNoteMutation({ noteId: noteToDelete._id })
      }
    }, 60000)
    
    // Add to deleted queue for timeout management
    setDeletedNotesQueue(prev => [...prev, { note: noteToDelete, timeoutId }])
    
    // Show toast with restore action
    toast({
      title: "Note deleted",
      description: noteToDelete.content.substring(0, 50) + (noteToDelete.content.length > 50 ? "..." : ""),
      action: <ToastAction altText="Restore" onClick={() => restoreNote(noteId)}>Restore</ToastAction>,
      duration: 60000
    })
  }

  const restoreNote = async (noteId: string) => {
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
      description: deletedItem.note.content.substring(0, 50) + (deletedItem.note.content.length > 50 ? "..." : ""),
      duration: 3000
    })
  }

  const deleteSelectedNotes = async () => {
    if (!Array.isArray(notes)) return
    
    const notesToDelete = notes.filter(note => selectedNotes.includes(note.id))
    
    // Store selected note IDs for bulk restore
    const deletedNoteIds = notesToDelete.map(note => note.id)
    
    // Remove all selected notes from visible state immediately
    const updatedNotes = notes.filter(note => !selectedNotes.includes(note.id))
    setNotes(updatedNotes)
    
    // Remove from localStorage immediately to persist deletion
    const currentNotes = loadLocalNotes()
    const filteredNotes = currentNotes.filter(note => !selectedNotes.includes(note.id))
    saveLocalNotes(filteredNotes)
    
    // Add all notes to deleted notes localStorage
    for (const note of notesToDelete) {
      addDeletedNote(note)
    }
    
    // Set timeouts for permanent deletion
    const timeoutIds: NodeJS.Timeout[] = []
    for (const note of notesToDelete) {
      const timeoutId = setTimeout(() => {
        // Remove from localStorage
        const currentNotes = loadLocalNotes()
        const filteredNotes = currentNotes.filter(n => n.id !== note.id)
        saveLocalNotes(filteredNotes)
        
        // Remove from deleted notes localStorage
        removeDeletedNote(note.id)
        
        // Permanently delete from Convex if authenticated
        if (session?.user && note._id) {
          deleteNoteMutation({ noteId: note._id })
        }
      }, 60000)
      timeoutIds.push(timeoutId)
    }
    
    // Add to deleted queue for timeout management
    setDeletedNotesQueue(prev => [
      ...prev, 
      ...notesToDelete.map((note, index) => ({ note, timeoutId: timeoutIds[index] }))
    ])
    
    // Exit select mode
    setSelectedNotes([])
    setIsSelectMode(false)
    
    // Show success toast with bulk restore action
    toast({
      title: "Notes deleted",
      description: `${notesToDelete.length} note${notesToDelete.length !== 1 ? 's' : ''} deleted`,
      action: <ToastAction altText="Restore All" onClick={() => restoreBulkNotes(deletedNoteIds)}>Restore All</ToastAction>,
      duration: 60000
    })
  }

  const restoreBulkNotes = async (noteIds: string[]) => {
    console.log("Attempting to restore bulk notes:", noteIds)
    
    // Get deleted notes from localStorage
    const deletedNotes = getDeletedNotes()
    const deletedItems = deletedNotes.filter(item => noteIds.includes(item.note.id))
    
    if (deletedItems.length === 0) {
      console.log("No notes found in deleted notes")
      return
    }
    
    console.log("Found deleted items:", deletedItems)
    
    // Clear timeouts from React state for all notes
    for (const noteId of noteIds) {
      const queueItem = deletedNotesQueue.find(item => item.note.id === noteId)
      if (queueItem) {
        clearTimeout(queueItem.timeoutId)
        setDeletedNotesQueue(prev => prev.filter(item => item.note.id !== noteId))
      }
    }
    
    // Remove from localStorage deleted notes
    for (const noteId of noteIds) {
      removeDeletedNote(noteId)
    }
    
    // Get current localStorage notes to check for duplicates
    const currentLocalNotes = loadLocalNotes()
    const currentLocalNoteIds = new Set(currentLocalNotes.map(note => note.id))
    
    // Only restore notes that are not already in localStorage
    const restoredNotes = deletedItems
      .map(item => item.note)
      .filter(note => !currentLocalNoteIds.has(note.id))
    
    if (restoredNotes.length === 0) {
      console.log("All notes are already restored")
      return
    }
    
    // Add notes back to localStorage since they were removed during deletion
    const updatedLocalNotes = [...currentLocalNotes, ...restoredNotes]
    saveLocalNotes(updatedLocalNotes)

    // Restore notes to list by reloading from localStorage to ensure consistency
    const restoredLocalNotes = loadLocalNotes()
    setNotes(restoredLocalNotes)
    
    // Show success toast
    toast({
      title: "Notes restored",
      description: `${restoredNotes.length} note${restoredNotes.length !== 1 ? 's' : ''} restored`,
      duration: 3000
    })
  }

  // Canvas panning handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // More permissive check - allow panning when clicking on canvas or empty areas
    if (e.target === canvasRef.current || e.currentTarget === canvasRef.current) {
      setIsPanning(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      lastPanRef.current = { x: viewportX, y: viewportY }
    }
  }, [viewportX, viewportY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      setViewportX(lastPanRef.current.x + deltaX)
      setViewportY(lastPanRef.current.y + deltaY)
    }
  }, [isPanning, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta))
    setZoom(newZoom)
  }, [zoom])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev * 1.2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.1, prev / 1.2))
  }

  const handleResetZoom = () => {
    setZoom(1)
    setViewportX(0)
    setViewportY(0)
  }

  // Prevent text selection during panning
  useEffect(() => {
    if (isPanning) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isPanning])

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-background overflow-hidden relative">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowNoteForm(true)}
              className="font-mono"
            >
              Add note
            </Button>
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
                <SignInDialog>
                  <button className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm">
                    Sign in
                  </button>
                </SignInDialog>
              )}
              <ThemeToggle />
            </div>
          </div>
          
          {/* Sync status */}
          {session?.user && (
            <div className="mt-2 text-center">
              <span className="font-mono text-xs text-muted-foreground">
                {isReconnecting && "Reconnecting..."}
                {!isReconnecting && syncStatus === "local-only" && "Local only"}
                {!isReconnecting && syncStatus === "syncing" && "Syncing..."}
                {!isReconnecting && syncStatus === "synced" && "Synced"}
                {!isReconnecting && syncStatus === "error" && "Sync error"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ 
          top: '80px', // Account for top bar
          height: 'calc(100vh - 80px)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* World container with zoom and pan transforms */}
        <div
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative',
            pointerEvents: 'none', // Allow clicks to pass through to canvas
          }}
        >
          {/* Notes */}
          {Array.isArray(notes) && notes.map((note) => (
            <div key={note.id} style={{ pointerEvents: 'auto' }}>
              <StickyNote
                note={note}
                viewportX={viewportX}
                viewportY={viewportY}
                zoom={zoom}
                onUpdate={(updates) => updateNote(note.id, updates)}
                onDelete={() => deleteNote(note.id)}
                isSelected={selectedNotes.includes(note.id)}
                onSelect={(selected) => {
                  if (selected) {
                    setSelectedNotes(prev => [...prev, note.id])
                  } else {
                    setSelectedNotes(prev => prev.filter(id => id !== note.id))
                  }
                }}
                isSelectMode={isSelectMode}
              />
            </div>
          ))}
        </div>
      </div>


      {/* Bottom controls */}
      <div className="fixed bottom-4 left-0 right-0 z-40">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-between">
            {/* Select mode controls */}
            <div className="flex gap-2">
              {!isSelectMode ? (
                <Button
                  variant="outline"
                  onClick={() => setIsSelectMode(true)}
                  className="font-mono"
                >
                  Select
                </Button>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    onClick={deleteSelectedNotes}
                    disabled={selectedNotes.length === 0}
                    className="font-mono"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedNotes.length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSelectMode(false)
                      setSelectedNotes([])
                    }}
                    className="font-mono"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                className="font-mono"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleResetZoom}
                className="font-mono"
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                className="font-mono"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Note Form Dialog */}
      {showNoteForm && (
        <NoteForm
          onSubmit={addNote}
          onClose={() => setShowNoteForm(false)}
          colors={COLORS}
        />
      )}

      {/* Toast Container */}
      <Toaster />
      </main>
    </ErrorBoundary>
  )
}