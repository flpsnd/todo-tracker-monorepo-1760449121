"use client"

import { useEffect } from "react"
import { Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatTime } from "@/lib/local-storage"

interface TimerCompletionDialogProps {
  isOpen: boolean
  onClose: () => void
  onRestart: () => void
  onStartNew: () => void
  timerName: string
  completedDuration: number
}

export function TimerCompletionDialog({
  isOpen,
  onClose,
  onRestart,
  onStartNew,
  timerName,
  completedDuration,
}: TimerCompletionDialogProps) {
  // Play sound when dialog opens
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio('/alarmclock.mp3')
      audio.play().catch((error) => {
        console.warn('Could not play completion sound:', error)
      })
    }
  }, [isOpen])

  const handleRestart = () => {
    onRestart()
    onClose()
  }

  const handleStartNew = () => {
    onStartNew()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-center">
            Timer Complete! 🎉
          </DialogTitle>
          <DialogDescription className="font-mono text-sm text-center">
            <div className="space-y-2">
              <div className="font-semibold text-foreground">{timerName}</div>
              <div className="text-2xl font-bold text-foreground">
                {formatTime(completedDuration)}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleRestart}
            className="w-full font-mono"
            variant="default"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart Timer
          </Button>
          <Button
            onClick={handleStartNew}
            className="w-full font-mono"
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            Start New Timer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
