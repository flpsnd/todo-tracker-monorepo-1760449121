"use client"

import { Reorder, useMotionValue } from "framer-motion"
import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import type { Task } from "@/app/page"

interface TaskCardProps {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
  onMoveToSection: (taskId: string, targetSection: string) => void
  onToggleCompletion: (taskId: string) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
  currentSection: string
  isSelectMode?: boolean
  isSelected?: boolean
  onSelect?: (taskId: string) => void
}

export function TaskCard({ task, onDragStart, onDragEnd, onMoveToSection, onToggleCompletion, onUpdateTask, onDelete, currentSection, isSelectMode = false, isSelected = false, onSelect }: TaskCardProps) {
  const y = useMotionValue(0)
  const cardRef = useRef<HTMLLIElement>(null)
  
  // Editing state
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [originalValue, setOriginalValue] = useState('')
  
  // Hover state for placeholder
  const [isHovered, setIsHovered] = useState(false)
  
  // Throttle drag detection to improve performance
  const lastDetectionTime = useRef(0)
  const THROTTLE_MS = 16 // ~60fps

  // Start editing a field
  const startEditing = (field: 'title' | 'description') => {
    setEditingField(field)
    const value = field === 'title' ? task.title : task.description
    setEditValue(value)
    setOriginalValue(value)
  }

  // Save the edit
  const saveEdit = () => {
    if (editingField && editValue.trim() !== originalValue) {
      onUpdateTask(task.id, { [editingField]: editValue.trim() })
    }
    setEditingField(null)
    setEditValue('')
    setOriginalValue('')
  }

  // Cancel the edit
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setOriginalValue('')
  }

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  // Cache sections to avoid repeated DOM queries
  const sectionsCache = useRef<Element[]>([])
  const updateSectionsCache = useCallback(() => {
    sectionsCache.current = Array.from(document.querySelectorAll("[data-section]"))
  }, [])

  useEffect(() => {
    // Update cache when component mounts
    updateSectionsCache()
    
    const unsubscribe = y.on("change", (latest) => {
      if (!cardRef.current) return

      // Throttle the detection to improve performance
      const now = Date.now()
      if (now - lastDetectionTime.current < THROTTLE_MS) return
      lastDetectionTime.current = now

      const cardRect = cardRef.current.getBoundingClientRect()
      const sections = sectionsCache.current

      // Find which section the card is currently over
      let targetSection = null
      for (const sectionEl of sections) {
        const sectionRect = sectionEl.getBoundingClientRect()
        const sectionKey = sectionEl.getAttribute("data-section")

        // Check if card center is within section bounds
        const cardCenterY = cardRect.top + cardRect.height / 2
        if (cardCenterY >= sectionRect.top && cardCenterY <= sectionRect.bottom && sectionKey) {
          targetSection = sectionKey
          break // Found the target, no need to continue
        }
      }
      
      // Store the target section for drop
      if (targetSection) {
        cardRef.current?.setAttribute("data-target-section", targetSection)
      }
    })

    return () => unsubscribe()
  }, [y, updateSectionsCache])

  return (
    <Reorder.Item
      ref={cardRef}
      value={task}
      onDragStart={isSelectMode ? undefined : onDragStart}
      onDragEnd={isSelectMode ? undefined : () => {
        onDragEnd()

        // Check if dropped over delete zone
        const deleteButton = document.querySelector('[data-delete-button]')
        if (deleteButton) {
          const deleteButtonRect = deleteButton.getBoundingClientRect()
          const cardRect = cardRef.current?.getBoundingClientRect()
          
          if (cardRect && 
              cardRect.left < deleteButtonRect.right &&
              cardRect.right > deleteButtonRect.left &&
              cardRect.top < deleteButtonRect.bottom &&
              cardRect.bottom > deleteButtonRect.top) {
            onDelete(task.id)
            return
          }
        }

        const targetSection = cardRef.current?.getAttribute("data-target-section")
        if (targetSection && targetSection !== task.section) {
          onMoveToSection(task.id, targetSection)
        }
      }}
      style={{ y }}
      className={isSelectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
      whileDrag={isSelectMode ? {} : {
        scale: 1.02,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        zIndex: 100,
      }}
    >
      <div
        className={`flex items-start gap-3 rounded-lg border border-border p-4 px-4 py-7 transition-all duration-200 ${
          task.completed ? "opacity-30" : "opacity-100"
        } ${
          isSelectMode 
            ? `cursor-pointer hover:scale-[1.02] ${isSelected ? "ring-2 ring-red-500 ring-offset-2" : ""}` 
            : ""
        }`}
        style={{ backgroundColor: task.color }}
        onClick={isSelectMode ? () => onSelect?.(task.id) : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 space-y-2.5">
          {/* Title row with checkbox */}
          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <div onClick={(e) => e.stopPropagation()}>
                <CustomCheckbox
                  checked={isSelected}
                  onChange={() => onSelect?.(task.id)}
                  variant="red"
                />
              </div>
            ) : (
              <CustomCheckbox
                checked={task.completed}
                onChange={() => onToggleCompletion(task.id)}
              />
            )}
            {editingField === 'title' ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="font-mono font-medium text-black bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0 flex-1"
                autoFocus
              />
            ) : (
              <h3 
                className={`font-mono font-medium text-black cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 transition-colors flex-1 ${
                  task.completed ? "line-through" : ""
                }`}
                onClick={() => startEditing('title')}
              >
                {task.title}
              </h3>
            )}
          </div>
          
          {/* Description row */}
          {task.description ? (
            editingField === 'description' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="font-mono text-sm text-black/80 bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0 w-full resize-none ml-8"
                autoFocus
                rows={2}
              />
            ) : (
              <p 
                className={`font-mono text-sm text-black/80 cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 transition-colors ml-8 ${
                  task.completed ? "line-through" : ""
                }`}
                onClick={() => startEditing('description')}
              >
                {task.description}
              </p>
            )
          ) : (
            !isSelectMode && (
              <div 
                className={`ml-8 transition-all duration-200 ease-in-out overflow-hidden ${
                  isHovered 
                    ? "max-h-8 opacity-100" 
                    : "max-h-0 opacity-0"
                }`}
              >
                <p 
                  className="font-mono text-sm text-black/40 cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 italic"
                  onClick={() => startEditing('description')}
                >
                  Enter description
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}
