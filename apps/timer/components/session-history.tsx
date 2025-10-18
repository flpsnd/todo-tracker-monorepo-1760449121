"use client"

import { useState } from "react"
import { ChevronLeft, Trash2 } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TimerSession, formatTime, deleteSession, addDeletedSession, removeDeletedSession, getDeletedSessions } from "@/lib/local-storage"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

interface SessionHistoryProps {
  isOpen: boolean
  onClose: () => void
  sessions: TimerSession[]
  onSessionsChange: (sessions: TimerSession[]) => void
}

export function SessionHistory({ isOpen, onClose, sessions, onSessionsChange }: SessionHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedSessionsQueue, setDeletedSessionsQueue] = useState<Array<{session: TimerSession, timeoutId: NodeJS.Timeout}>>([])
  
  // Toast hook
  const { toast } = useToast()

  const handleDelete = (sessionId: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionId)
    if (!sessionToDelete) return
    
    // Remove from visible sessions immediately
    const updatedSessions = sessions.filter(session => session.id !== sessionId)
    onSessionsChange(updatedSessions)
    
    // Remove from localStorage immediately to persist deletion
    deleteSession(sessionId)
    
    // Add to localStorage deleted sessions for restore functionality
    addDeletedSession(sessionToDelete)
    
    // Set 60s timeout for permanent deletion from deleted sessions
    const timeoutId = setTimeout(() => {
      // Remove from deleted sessions localStorage
      removeDeletedSession(sessionId)
    }, 60000)
    
    // Add to deleted queue for timeout management
    setDeletedSessionsQueue(prev => [...prev, { session: sessionToDelete, timeoutId }])
    
    // Show toast with restore action
    toast({
      title: "Session deleted",
      description: sessionToDelete.name,
      action: <ToastAction altText="Restore" onClick={() => restoreSession(sessionId)}>Restore</ToastAction>,
      duration: 60000
    })
    
    // Reset deleting state after a short delay
    setTimeout(() => setDeletingId(null), 300)
  }

  const restoreSession = (sessionId: string) => {
    console.log("Attempting to restore session:", sessionId)
    
    // Check if session is already in localStorage to prevent duplicates
    const currentLocalSessions = sessions
    const currentLocalSessionIds = new Set(currentLocalSessions.map(session => session.id))
    if (currentLocalSessionIds.has(sessionId)) {
      console.log("Session is already restored")
      return
    }
    
    // Get deleted sessions from localStorage
    const deletedSessions = getDeletedSessions()
    const deletedItem = deletedSessions.find(item => item.session.id === sessionId)
    
    if (!deletedItem) {
      console.log("Session not found in deleted sessions")
      return
    }
    
    console.log("Found deleted item:", deletedItem)
    
    // Clear timeout from React state
    const queueItem = deletedSessionsQueue.find(item => item.session.id === sessionId)
    if (queueItem) {
      clearTimeout(queueItem.timeoutId)
      setDeletedSessionsQueue(prev => prev.filter(item => item.session.id !== sessionId))
    }
    
    // Remove from localStorage deleted sessions
    removeDeletedSession(sessionId)
    
    // Add session back to localStorage since it was removed during deletion
    const updatedLocalSessions = [...currentLocalSessions, deletedItem.session]
    onSessionsChange(updatedLocalSessions)
    
    // Show success toast
    toast({
      title: "Session restored",
      description: deletedItem.session.name,
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

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="max-w-2xl mx-auto py-8 pb-[200px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-balance font-mono">
                Timer History
              </h2>
              <ThemeToggle />
            </div>
            
            <div className="space-y-6">
              {sessions.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <p className="font-mono text-sm text-muted-foreground">
                    No completed sessions yet.
                  </p>
                </div>
              ) : (
                sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`session-item cursor-pointer group pb-5 ${
                      index < sessions.length - 1 ? 'border-b border-border' : ''
                    } ${deletingId === session.id ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-mono text-lg font-semibold leading-tight">
                            {session.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="font-mono text-2xl font-bold text-foreground">
                              {formatTime(session.duration)}
                            </div>
                            <div className="font-mono text-sm text-muted-foreground">
                              {formatDuration(session.duration)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(session.id)}
                            className="font-mono text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            disabled={deletingId === session.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-xs text-muted-foreground font-mono">
                        <span>Completed {formatDate(session.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Back button */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50">
            <div className="mx-auto max-w-2xl">
              <Button
                variant="outline"
                onClick={onClose}
                className="font-mono"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Timer
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
