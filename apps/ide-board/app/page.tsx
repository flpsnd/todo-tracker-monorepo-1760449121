"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { loadLocalNotes, saveLocalNotes, Note } from "@/lib/local-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { StickyNote } from "../components/sticky-note"
import { NoteForm } from "../components/note-form"

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
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastPanRef = useRef({ x: 0, y: 0 })

  // Auth state
  const { data: session } = authClient.useSession()
  
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
  }

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Load notes from localStorage immediately
    const localNotes = loadLocalNotes()
    setNotes(localNotes)
    setHasInitialized(true)

    // If user is authenticated, sync with Convex
    if (session?.user && convexNotes !== undefined) {
      handleSyncWithConvex()
    }
  }, [session, convexNotes, hasInitialized])

  // Handle sync with Convex when user signs in
  const handleSyncWithConvex = async () => {
    if (!session?.user || convexNotes === undefined || !syncLocalNotesMutation) return

    setSyncStatus("syncing")
    try {
      // If we have local notes and no Convex notes, upload local notes
      if (notes.length > 0 && convexNotes.length === 0) {
        await syncLocalNotesMutation({
          notes: notes.map((note: Note) => ({
            content: note.content,
            color: note.color,
            x: note.x,
            y: note.y,
          }))
        })
      }
      
      // Update local state with Convex notes
      if (convexNotes.length > 0) {
        const convexNotesFormatted = convexNotes.map((note: any) => ({
          id: note._id, // Use Convex ID as the main ID
          _id: note._id, // Also store as _id for Convex operations
          content: note.content,
          color: note.color,
          x: note.x,
          y: note.y,
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

  const addNote = async (note: Omit<Note, "id" | "x" | "y">) => {
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
    }
    
    // Update local state immediately
    const updatedNotes = [...notes, newNote]
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
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync note:", error)
        setSyncStatus("error")
      }
    }
  }

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
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
    const noteToDelete = notes.find(n => n.id === noteId)
    if (!noteToDelete) return
    
    // Remove from local state immediately
    const updatedNotes = notes.filter(n => n.id !== noteId)
    setNotes(updatedNotes)
    saveLocalNotes(updatedNotes)
    
    // If authenticated, also delete from Convex
    if (session?.user && noteToDelete._id && deleteNoteMutation) {
      try {
        setSyncStatus("syncing")
        await deleteNoteMutation({ noteId: noteToDelete._id })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync note deletion:", error)
        setSyncStatus("error")
      }
    }
  }

  const deleteSelectedNotes = async () => {
    const notesToDelete = notes.filter(note => selectedNotes.includes(note.id))
    
    for (const note of notesToDelete) {
      await deleteNote(note.id)
    }
    
    setSelectedNotes([])
    setIsSelectMode(false)
  }

  // Canvas panning handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
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
                {syncStatus === "local-only" && "Local only"}
                {syncStatus === "syncing" && "Syncing..."}
                {syncStatus === "synced" && "Synced"}
                {syncStatus === "error" && "Sync error"}
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
          }}
        >
          {/* Notes */}
          {notes.map((note) => (
            <StickyNote
              key={note.id}
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
    </main>
  )
}