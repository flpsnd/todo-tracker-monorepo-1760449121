"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, History, RotateCcw } from "lucide-react"
import { TimerDisplay } from "@/components/timer-display"
import { TimerCompletionDialog } from "@/components/timer-completion-dialog"
import { SessionHistory } from "@/components/session-history"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { 
  loadLocalSessions, 
  saveLocalSessions, 
  loadCurrentTimer, 
  saveCurrentTimer, 
  clearCurrentTimer,
  addSession,
  TimerSession,
  CurrentTimer
} from "@/lib/local-storage"

export default function Home() {
  const [timerName, setTimerName] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(25 * 60 * 1000) // 25 minutes default
  const [initialTime, setInitialTime] = useState(25 * 60 * 1000)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState<TimerSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [hasBeenStarted, setHasBeenStarted] = useState(false)

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusMode') === 'true'
    }
    return false
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
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

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Load sessions from localStorage
    const localSessions = loadLocalSessions()
    setSessions(localSessions)
    
    // Try to restore current timer state
    const currentTimer = loadCurrentTimer()
    if (currentTimer) {
      setTimerName(currentTimer.name)
      setTimeRemaining(currentTimer.timeRemaining)
      setInitialTime(currentTimer.initialTime)
      setIsRunning(currentTimer.isRunning)
      setStartedAt(currentTimer.startedAt || null)
    }
    
    setHasInitialized(true)
  }, [hasInitialized])

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && startedAt) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = now - startedAt
        const newTimeRemaining = Math.max(0, initialTime - elapsed)
        
        setTimeRemaining(newTimeRemaining)
        
        if (newTimeRemaining <= 0) {
          handleTimerComplete()
        }
      }, 100) // Update every 100ms for smooth countdown
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, startedAt, initialTime])

  // Auto-save timer state
  useEffect(() => {
    if (!hasInitialized) return

    const currentTimer: CurrentTimer = {
      name: timerName,
      initialTime,
      timeRemaining,
      isRunning,
      startedAt: startedAt || undefined,
    }
    saveCurrentTimer(currentTimer)
  }, [timerName, initialTime, timeRemaining, isRunning, startedAt, hasInitialized])

  // Update browser tab title
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      const totalSeconds = Math.floor(timeRemaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      let timeString: string
      if (hours > 0) {
        timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      } else {
        timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      
      document.title = `${timeString} - ${timerName}`
    } else {
      document.title = "Timer"
    }
  }, [isRunning, timeRemaining, timerName])

  const handleStartStop = () => {
    if (isRunning) {
      // Stop timer
      setIsRunning(false)
      setStartedAt(null)
    } else {
      // Start timer
      setIsRunning(true)
      setStartedAt(Date.now())
      setHasBeenStarted(true)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeRemaining(initialTime)
    setStartedAt(null)
    setHasBeenStarted(false)
  }

  const handleTimeChange = (newTime: number) => {
    setTimeRemaining(newTime)
    setInitialTime(newTime)
    setIsRunning(false)
    setStartedAt(null)
  }

  const handleTimerComplete = () => {
    setIsRunning(false)
    setStartedAt(null)
    
    // Save completed session
    const completedSession: TimerSession = {
      id: crypto.randomUUID(),
      name: timerName,
      duration: initialTime,
      completedAt: Date.now(),
    }
    
    const updatedSessions = [completedSession, ...sessions]
    setSessions(updatedSessions)
    saveLocalSessions(updatedSessions)
    
    // Show completion dialog
    setShowCompletionDialog(true)
  }

  const handleRestart = () => {
    setTimeRemaining(initialTime)
    setIsRunning(false)
    setStartedAt(null)
  }

  const handleStartNew = () => {
    setTimerName("")
    setTimeRemaining(25 * 60 * 1000)
    setInitialTime(25 * 60 * 1000)
    setIsRunning(false)
    setStartedAt(null)
    setHasBeenStarted(false)
    clearCurrentTimer()
  }

  const handleSessionsChange = (newSessions: TimerSession[]) => {
    setSessions(newSessions)
    saveLocalSessions(newSessions)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        handleStartStop()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        handleReset()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning])

  if (!hasInitialized) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-muted-foreground">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Main timer area */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <div className="space-y-6">
            {/* Timer name input with theme toggle */}
            <div className="flex items-center justify-between">
              <div className="relative flex-1">
                <Input
                  value={timerName}
                  onChange={(e) => setTimerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      // Focus could go to timer display if needed
                    }
                  }}
                  className="font-mono text-2xl font-bold tracking-tight text-balance border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                  placeholder="Add title..."
                />
              </div>
              <div 
                className={`transition-transform duration-300 ease-in-out ${
                  isFocusMode ? '-translate-y-full' : 'translate-y-0'
                }`}
              >
                <ThemeToggle />
              </div>
            </div>
            
            {/* Timer display */}
            <div className="flex justify-center">
              <TimerDisplay
                timeRemaining={timeRemaining}
                onTimeChange={handleTimeChange}
                isRunning={isRunning}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Completion dialog */}
      <TimerCompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        onRestart={handleRestart}
        onStartNew={handleStartNew}
        timerName={timerName}
        completedDuration={initialTime}
      />

      {/* History panel */}
      <SessionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        onSessionsChange={handleSessionsChange}
      />

      {/* Bottom controls */}
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
                onClick={handleStartStop}
                className="font-mono"
                disabled={timeRemaining <= 0}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
              
              {hasBeenStarted && (
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="font-mono"
                  disabled={isRunning}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2"
                aria-label="Toggle timer history visibility"
              >
                <History className="h-4 w-4" />
                <span className="font-mono text-sm">
                  {showHistory ? "Back" : "History"}
                </span>
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
