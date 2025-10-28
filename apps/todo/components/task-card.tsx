"use client"

import { Reorder, useMotionValue } from "framer-motion"
import { useEffect, useRef, useState, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import { ColorPicker } from "@/components/color-picker"
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
  
  // Store the target section in a ref instead of DOM attribute
  const targetSectionRef = useRef<string | null>(null)
  
  // Editing state
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [originalValue, setOriginalValue] = useState('')
  
  // Hover state for placeholder
  const [isHovered, setIsHovered] = useState(false)
  
  // Color picker dropdown state
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  
  // Throttle drag detection to improve performance
  const lastDetectionTime = useRef(0)
  const THROTTLE_MS = 16 // ~60fps
  
  // Auto-scroll when dragging near edges
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isScrolling = useRef(false)
  
  // Track drag start position to prevent accidental drops
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null)
  const hasDraggedEnough = useRef(false)
  
  // Track auto-scroll state to prevent section detection conflicts
  const isAutoScrolling = useRef(false)
  
  // Scroll configuration
  const SCROLL_THRESHOLD = 120 // pixels from edge to trigger scroll
  const SCROLL_AMOUNT = 70 // pixels to scroll per trigger

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
        // Update cache on every drag movement to catch newly rendered sections
        updateSectionsCache()
        if (!cardRef.current) return

        // Check if user has dragged enough distance (minimum 20px)
        if (dragStartPosition.current) {
          const currentY = latest
          const dragDistance = Math.abs(currentY - dragStartPosition.current.y)
          if (dragDistance > 20) {
            hasDraggedEnough.current = true
          }
        }

        // Throttle the detection to improve performance
        const now = Date.now()
        if (now - lastDetectionTime.current < THROTTLE_MS) return
        lastDetectionTime.current = now

        const cardRect = cardRef.current.getBoundingClientRect()
        const sections = sectionsCache.current


      // Auto-scroll when dragging near top or bottom of viewport
      const viewportHeight = window.innerHeight
      const cardTop = cardRect.top
      const cardBottom = cardRect.bottom
      
      // Determine if we should scroll
      const shouldScrollUp = cardTop < SCROLL_THRESHOLD
      const shouldScrollDown = cardBottom > viewportHeight - SCROLL_THRESHOLD
      
      if (shouldScrollUp || shouldScrollDown) {
        // Set auto-scroll flag to prevent section detection during scroll
        isAutoScrolling.current = true
        
        // Clear any existing timeout to prevent conflicts
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Execute scroll immediately (no setTimeout wrapper)
        const scrollDirection = shouldScrollUp ? -1 : 1
        window.scrollBy({
          top: scrollDirection * SCROLL_AMOUNT,
          behavior: 'auto' // Use auto instead of smooth for better mobile performance
        })
        
        // Reset auto-scroll flag after a minimal delay to allow scroll to process
        scrollTimeoutRef.current = setTimeout(() => {
          isAutoScrolling.current = false
        }, 50) // 50ms is enough for the scroll to be processed
      } else {
        // Not in scroll zone - clear any pending scroll operations
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
          scrollTimeoutRef.current = null
        }
        isAutoScrolling.current = false
      }

      // Skip section detection during auto-scroll to prevent conflicts
      if (!isAutoScrolling.current) {
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
          targetSectionRef.current = targetSection;
        }
      }
    })

    return () => {
      unsubscribe()
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [y, updateSectionsCache])

  return (
    <Reorder.Item
      ref={cardRef}
      value={task}
      onDragStart={isSelectMode ? undefined : (event, info) => {
        dragStartPosition.current = { x: info.point.x, y: info.point.y }
        hasDraggedEnough.current = false
        onDragStart()
      }}
        onDragEnd={isSelectMode ? undefined : () => {
          // Clear any pending scroll timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
            scrollTimeoutRef.current = null
          }
          
          // Reset auto-scroll flags
          isAutoScrolling.current = false
          isScrolling.current = false
          
          onDragEnd()

          // Only allow drops if user has dragged enough distance
          if (hasDraggedEnough.current) {
            const targetSection = targetSectionRef.current;
            if (targetSection && targetSection !== task.section) {
              console.log("Moving task", task.id, "from", task.section, "to", targetSection);
              onMoveToSection(task.id, targetSection)
            }
          }
          
          // Reset drag tracking
          dragStartPosition.current = null
          hasDraggedEnough.current = false
          targetSectionRef.current = null;
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
              <div className="flex items-center justify-between flex-1">
                <h3 
                  className={`font-mono font-medium text-black cursor-pointer hover:bg-black/5 rounded px-1 py-0.5 transition-colors ${
                    task.completed ? "line-through" : ""
                  }`}
                  onClick={() => startEditing('title')}
                >
                  {task.title}
                </h3>
                {!isSelectMode && (
                  <div 
                    className={`transition-all duration-200 ease-in-out overflow-hidden flex items-center gap-2 ${
                      (isHovered || isColorPickerOpen)
                        ? "max-h-6 opacity-100" 
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <ColorPicker
                      currentColor={task.color}
                      onColorChange={(newColor) => onUpdateTask(task.id, { color: newColor })}
                      onOpenChange={setIsColorPickerOpen}
                      side="bottom"
                      className="h-5 w-5"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(task.id)
                      }}
                      className="h-5 w-5 flex items-center justify-center hover:bg-black/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-black" />
                    </button>
                  </div>
                )}
              </div>
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
