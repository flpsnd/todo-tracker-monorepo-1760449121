"use client"

import { Reorder, useMotionValue } from "framer-motion"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Trash2 } from "lucide-react"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import { ColorPicker } from "@/components/color-picker"
import { COLORS } from "@/lib/colors"
import type { Task } from "@/app/page"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface TaskCardProps {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
  onMoveToSection: (taskId: string, targetSection: string) => void
  onToggleCompletion: (taskId: string) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
  isSelectMode?: boolean
  isSelected?: boolean
  onSelect?: (taskId: string) => void
}

export function TaskCard({ task, onDragStart, onDragEnd, onMoveToSection, onToggleCompletion, onUpdateTask, onDelete, isSelectMode = false, isSelected = false, onSelect }: TaskCardProps) {
  const y = useMotionValue(0)
  const cardRef = useRef<HTMLLIElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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
  
  // Get text color based on task background color
  const textColor = useMemo(() => {
    const colorConfig = COLORS.find(c => c.value.toLowerCase() === task.color.toLowerCase())
    return colorConfig?.textColor || "#000000"
  }, [task.color])
  
  // Throttle drag detection to improve performance
  const lastDetectionTime = useRef(0)
  const THROTTLE_MS = 16 // ~60fps
  
  // Auto-scroll when dragging near edges
  const scrollAnimationFrameRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const pointerClientY = useRef<number | null>(null)
  const pointerMoveHandlerRef = useRef<((event: PointerEvent) => void) | null>(null)
  const touchMoveHandlerRef = useRef<((event: TouchEvent) => void) | null>(null)
  
  // Track drag start position to prevent accidental drops
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null)
  const hasDraggedEnough = useRef(false)
  
  // Track auto-scroll state to prevent section detection conflicts
  const isAutoScrolling = useRef(false)
  
  // Scroll configuration
  const SCROLL_THRESHOLD = 120 // pixels from edge to trigger scroll
  const SCROLL_AMOUNT = 8 // pixels to scroll per frame (reduced for smoother continuous scroll)

  // Start editing a field
  const startEditing = (field: 'title' | 'description') => {
    setEditingField(field)
    const value = field === 'title' ? task.title : task.description
    setEditValue(value)
    setOriginalValue(value)
    
    // Auto-resize textarea when starting to edit description
    if (field === 'description' && textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
      }, 0)
    }
  }

  // Auto-resize textarea on input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Save the edit
  const saveEdit = () => {
    if (editingField) {
      // For description, preserve markdown formatting (don't trim all whitespace)
      // Only trim leading/trailing whitespace, but preserve internal formatting
      const trimmedValue = editingField === 'description' 
        ? editValue.trimEnd().replace(/^\s+/, '') // Trim end and leading whitespace only
        : editValue.trim()
      
      if (trimmedValue !== originalValue) {
        onUpdateTask(task.id, { [editingField]: trimmedValue })
      }
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
      // For description, allow Shift+Enter for newline, Enter to submit
      if (editingField === 'description') {
        if (e.shiftKey) {
          // Allow default behavior (newline)
          return
        } else {
          // Submit on Enter (without Shift)
          e.preventDefault()
          saveEdit()
        }
      } else {
        // For title, Enter always submits
        e.preventDefault()
        saveEdit()
      }
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

  const getScrollDirection = useCallback(() => {
    if (!isDraggingRef.current) {
      return 0
    }

    const viewportHeight = window.innerHeight
    const pointerY = pointerClientY.current

    if (pointerY !== null) {
      if (pointerY < SCROLL_THRESHOLD) return -1
      if (pointerY > viewportHeight - SCROLL_THRESHOLD) return 1
      return 0
    }

    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect()
      const cardCenterY = cardRect.top + cardRect.height / 2
      if (cardCenterY < SCROLL_THRESHOLD) return -1
      if (cardCenterY > viewportHeight - SCROLL_THRESHOLD) return 1
    }

    return 0
  }, [])

  // Continuous scroll function using requestAnimationFrame
  // Based on research: Don't adjust motion value - let Framer Motion handle drag naturally
  // Just handle the scroll, Framer Motion will track pointer position automatically
  const performContinuousScroll = useCallback(() => {
    if (!isDraggingRef.current) {
      isAutoScrolling.current = false
      scrollAnimationFrameRef.current = null
      return
    }

    const direction = getScrollDirection()

    if (direction === 0) {
      isAutoScrolling.current = false
      scrollAnimationFrameRef.current = null
      return
    }

    isAutoScrolling.current = true
    
    // Simply scroll - Framer Motion will handle keeping the card under the pointer
    // The key is that we're using pointer/touch position, not card position
    window.scrollBy({
      top: direction * SCROLL_AMOUNT,
      behavior: 'auto'
    })

    scrollAnimationFrameRef.current = requestAnimationFrame(performContinuousScroll)
  }, [getScrollDirection])

  // Function to check scroll zone and start/stop scrolling
  // This is called frequently, so it needs to be lightweight and efficient
  const checkScrollZone = useCallback(() => {
    if (!isDraggingRef.current) {
      // If not dragging, ensure scroll is stopped
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current)
        scrollAnimationFrameRef.current = null
        isAutoScrolling.current = false
      }
      return
    }

    const direction = getScrollDirection()

    if (direction !== 0) {
      // Need to scroll - start the loop if not already running
      isAutoScrolling.current = true
      if (!scrollAnimationFrameRef.current) {
        scrollAnimationFrameRef.current = requestAnimationFrame(performContinuousScroll)
      }
    } else {
      // Not in scroll zone - stop scrolling if it's running
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current)
        scrollAnimationFrameRef.current = null
        isAutoScrolling.current = false
      }
    }
  }, [getScrollDirection, performContinuousScroll])

  // Auto-resize textarea when editValue changes
  useEffect(() => {
    if (editingField === 'description' && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editValue, editingField])

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

      // CRITICAL: Always check scroll zone - don't throttle this
      // This ensures the scroll loop starts/stops correctly even during rapid motion value changes
      checkScrollZone()

      // Throttle the section detection to improve performance
      const now = Date.now()
      if (now - lastDetectionTime.current < THROTTLE_MS) return
      lastDetectionTime.current = now

      const cardRect = cardRef.current.getBoundingClientRect()
      const sections = sectionsCache.current

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

      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current)
        scrollAnimationFrameRef.current = null
      }

      if (pointerMoveHandlerRef.current) {
        document.removeEventListener('pointermove', pointerMoveHandlerRef.current)
        pointerMoveHandlerRef.current = null
      }

      if (touchMoveHandlerRef.current) {
        document.removeEventListener('touchmove', touchMoveHandlerRef.current)
        touchMoveHandlerRef.current = null
      }

      isDraggingRef.current = false
      isAutoScrolling.current = false
      pointerClientY.current = null
    }
  }, [y, updateSectionsCache, performContinuousScroll, checkScrollZone])


  return (
    <Reorder.Item
      ref={cardRef}
      value={task}
      onDragStart={isSelectMode ? undefined : (event, info) => {
        dragStartPosition.current = { x: info.point.x, y: info.point.y }
        hasDraggedEnough.current = false
        isDraggingRef.current = true
        pointerClientY.current = info.point.y

        // Add pointer listener to track pointer position during drag
        pointerMoveHandlerRef.current = (pointerEvent: PointerEvent) => {
          if (!isDraggingRef.current) return
          pointerClientY.current = pointerEvent.clientY
          checkScrollZone()
        }
        document.addEventListener('pointermove', pointerMoveHandlerRef.current)

        // Add touch listener specifically for touch devices (older browsers without pointer events)
        touchMoveHandlerRef.current = (touchEvent: TouchEvent) => {
          if (!isDraggingRef.current) return
          const touch = touchEvent.touches[0]
          pointerClientY.current = touch ? touch.clientY : null
          checkScrollZone()
        }
        document.addEventListener('touchmove', touchMoveHandlerRef.current, { passive: true })

        // Immediately check scroll zone in case we start near an edge
        checkScrollZone()

        onDragStart()
      }}
        onDragEnd={isSelectMode ? undefined : () => {
          // Stop dragging
          isDraggingRef.current = false
          pointerClientY.current = null

          // Remove pointer event listener
          if (pointerMoveHandlerRef.current) {
            document.removeEventListener('pointermove', pointerMoveHandlerRef.current)
            pointerMoveHandlerRef.current = null
          }

          // Remove touch event listener
          if (touchMoveHandlerRef.current) {
            document.removeEventListener('touchmove', touchMoveHandlerRef.current)
            touchMoveHandlerRef.current = null
          }

          // Stop continuous scrolling
          if (scrollAnimationFrameRef.current) {
            cancelAnimationFrame(scrollAnimationFrameRef.current)
            scrollAnimationFrameRef.current = null
          }

          // Reset auto-scroll flags
          isAutoScrolling.current = false
          
          onDragEnd()

          // Only allow drops if user has dragged enough distance
          if (hasDraggedEnough.current) {
            const targetSection = targetSectionRef.current;
            if (targetSection && targetSection !== task.dueDate) {
              console.log("Moving task", task.id, "from", task.dueDate, "to", targetSection);
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
      // Apply touch-action via CSS to prevent native scrolling interference
      // This is critical for mobile drag-and-drop to work properly
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
            ? `cursor-pointer hover:scale-[1.02] ${isSelected ? "ring-2 ring-black dark:ring-white ring-offset-2" : ""}` 
            : "cursor-pointer"
        }`}
        style={{ 
          backgroundColor: task.color,
          touchAction: isSelectMode ? undefined : 'none' // Critical: prevents native touch scrolling interference
        }}
        onClick={isSelectMode ? () => onSelect?.(task.id) : (e) => {
          // Toggle completion when clicking on the card, but not on interactive elements
          // The click target check ensures we don't toggle when clicking on title/description/buttons
          const target = e.target as HTMLElement
          // Check if click is on title, description, delete button, color picker, or checkbox
          if (
            target.closest('h3') || 
            target.closest('p') || 
            target.closest('button') || 
            target.closest('[data-color-picker]') ||
            target.closest('input') ||
            target.closest('textarea')
          ) {
            return // Don't toggle if clicking on these elements
          }
          onToggleCompletion(task.id)
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 space-y-2.5">
          {/* Title row with checkbox */}
          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                <CustomCheckbox
                  checked={isSelected}
                  onChange={() => onSelect?.(task.id)}
                  variant="red"
                />
              </div>
            ) : (
              <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                <CustomCheckbox
                  checked={task.completed}
                  onChange={() => onToggleCompletion(task.id)}
                />
              </div>
            )}
            {editingField === 'title' ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="font-mono font-medium text-[16px] bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0 flex-1 min-w-0"
                style={{ color: textColor }}
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <h3 
                  className={`font-mono font-medium text-[18px] sm:text-base cursor-pointer rounded px-1 py-0.5 transition-colors flex-1 min-w-0 ${
                    task.completed ? "line-through" : ""
                  }`}
                  style={{ 
                    color: textColor,
                    ...(textColor === "#000000" ? { "--hover-bg": "rgba(0,0,0,0.05)" } : { "--hover-bg": "rgba(255,255,255,0.1)" })
                  }}
                  onMouseEnter={(e) => {
                    if (textColor === "#000000") {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)"
                    } else {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isSelectMode) {
                      startEditing('title')
                    }
                  }}
                >
                  {task.title}
                </h3>
                {!isSelectMode && (
                  <div 
                    className={`transition-all duration-200 ease-in-out ${isColorPickerOpen ? "overflow-visible" : "overflow-hidden"} flex items-center gap-2 flex-shrink-0 ml-2 ${
                      (isHovered || isColorPickerOpen)
                        ? "max-h-6 opacity-100" 
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div data-color-picker onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                      <ColorPicker
                        currentColor={task.color}
                        onColorChange={(newColor) => onUpdateTask(task.id, { color: newColor })}
                        onOpenChange={setIsColorPickerOpen}
                        side="bottom"
                        className="h-5 w-5 rounded-full p-0 border-2 flex items-center justify-center"
                        borderColor={task.color.toLowerCase() === "#000000" ? "white" : "black"}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(task.id)
                      }}
                      className="h-5 w-5 flex items-center justify-center rounded transition-colors flex-shrink-0"
                      style={{ 
                        color: textColor,
                        ...(textColor === "#000000" 
                          ? { "--hover-bg": "rgba(0,0,0,0.1)" } 
                          : { "--hover-bg": "rgba(255,255,255,0.2)" })
                      }}
                      onMouseEnter={(e) => {
                        if (textColor === "#000000") {
                          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)"
                        } else {
                          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent"
                      }}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: textColor }} />
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
                ref={textareaRef}
                value={editValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="font-mono text-[16px] bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0 w-full resize-none overflow-hidden"
                style={{ 
                  color: textColor, 
                  opacity: 0.8, 
                  marginLeft: '30px',
                  minHeight: '1.5rem',
                  lineHeight: '1.5rem'
                }}
                autoFocus
                rows={1}
              />
            ) : (
              <div
                className={`cursor-pointer rounded py-0.5 transition-colors ${
                  task.completed ? "line-through" : ""
                }`}
                style={{ 
                  color: textColor, 
                  opacity: 0.8,
                  marginLeft: '30px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  ...(textColor === "#000000" ? { "--hover-bg": "rgba(0,0,0,0.05)" } : { "--hover-bg": "rgba(255,255,255,0.1)" })
                }}
                onMouseEnter={(e) => {
                  if (textColor === "#000000") {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)"
                  } else {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isSelectMode) {
                    startEditing('description')
                  }
                }}
              >
                <div 
                  className="font-mono text-[16px] sm:text-sm"
                  style={{ color: textColor }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => {
                        // Don't wrap in p if it's empty or just whitespace
                        if (!children || (Array.isArray(children) && children.length === 0)) {
                          return <br />
                        }
                        return (
                          <div style={{ display: 'block', marginBottom: '0.5rem', color: textColor }}>
                            {children}
                          </div>
                        )
                      },
                      ul: ({ children }) => (
                        <ul style={{ 
                          marginLeft: '1.25rem', 
                          marginTop: '0.25rem', 
                          marginBottom: '0.5rem', 
                          listStyleType: 'disc',
                          color: textColor,
                          paddingLeft: '0.5rem'
                        }}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ 
                          marginLeft: '1.25rem', 
                          marginTop: '0.25rem', 
                          marginBottom: '0.5rem', 
                          listStyleType: 'decimal',
                          color: textColor,
                          paddingLeft: '0.5rem'
                        }}>
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ 
                          marginBottom: '0.25rem', 
                          color: textColor,
                          display: 'list-item'
                        }}>
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 'bold', color: textColor }}>{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ fontStyle: 'italic', color: textColor }}>{children}</em>
                      ),
                      code: ({ children }) => (
                        <code style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.875em',
                          color: textColor,
                          backgroundColor: textColor === "#000000" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                          padding: '0.125rem 0.25rem',
                          borderRadius: '0.25rem'
                        }}>
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {task.description}
                  </ReactMarkdown>
                </div>
              </div>
            )
          ) : (
            editingField === 'description' ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                className="font-mono text-[16px] bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none p-0 w-full resize-none overflow-hidden"
                style={{ 
                  color: textColor, 
                  opacity: 0.8, 
                  marginLeft: '30px',
                  minHeight: '1.5rem',
                  lineHeight: '1.5rem'
                }}
                autoFocus
                rows={1}
              />
            ) : (
              !isSelectMode && (
                <div 
                  className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isHovered 
                      ? "max-h-8 opacity-100" 
                      : "max-h-0 opacity-0"
                  }`}
                  style={{ marginLeft: '30px' }}
                >
                  <p 
                    className={`font-mono text-[16px] sm:text-sm cursor-pointer rounded py-0.5 italic ${
                      task.completed ? "line-through" : ""
                    }`}
                    style={{ 
                      color: textColor,
                      opacity: 0.4,
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      ...(textColor === "#000000" ? { "--hover-bg": "rgba(0,0,0,0.05)" } : { "--hover-bg": "rgba(255,255,255,0.1)" })
                    }}
                    onMouseEnter={(e) => {
                      if (textColor === "#000000") {
                        e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)"
                      } else {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isSelectMode) {
                        startEditing('description')
                      }
                    }}
                  >
                    Enter description
                  </p>
                </div>
              )
            )
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}
