"use client"

import { useState } from "react"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Task } from "@/app/page"

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedTasks: Task[]
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedTasks,
}: DeleteConfirmationDialogProps) {
  const [showAll, setShowAll] = useState(false)
  
  const taskCount = selectedTasks.length
  const previewTasks = showAll ? selectedTasks : selectedTasks.slice(0, 3)
  const hasMore = selectedTasks.length > 3

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete {taskCount} task{taskCount !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="font-mono text-sm">
            This action cannot be undone. Tasks will be permanently deleted after 60 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="font-mono text-sm text-muted-foreground">
            Selected tasks:
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {previewTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded border border-border bg-muted/50"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color }}
                />
                <span className="font-mono text-sm truncate">
                  {task.title}
                </span>
              </div>
            ))}
          </div>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="font-mono text-xs w-full"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show all {taskCount} tasks
                </>
              )}
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-mono"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="font-mono"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {taskCount} task{taskCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
