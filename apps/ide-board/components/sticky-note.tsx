"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Check } from "lucide-react"
import { Note } from "@/lib/local-storage"

interface StickyNoteProps {
  note: Note
  viewportX: number
  viewportY: number
  zoom: number
  onUpdate: (updates: Partial<Note>) => void
  onDelete: () => void
  isSelected: boolean
  onSelect: (selected: boolean) => void
  isSelectMode: boolean
}

export function StickyNote({
  note,
  viewportX,
  viewportY,
  zoom,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  isSelectMode,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isColorPickerHovered, setIsColorPickerHovered] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialRotation, setInitialRotation] = useState(0)
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 })
  const [content, setContent] = useState(note.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)

  // Helper function to rotate a vector by an angle in radians
  const rotateVector = (x: number, y: number, angle: number): [number, number] => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [x * cos - y * sin, x * sin + y * cos]
  }

  // Update content when note changes
  useEffect(() => {
    setContent(note.content)
  }, [note.content])

  // Handle click outside to deactivate note
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isActive && noteRef.current && !noteRef.current.contains(e.target as Node)) {
        setIsActive(false)
      }
    }

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isActive])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSelectMode) {
      setIsActive(true)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isSelectMode) {
      onSelect(!isSelected)
      return
    }

    const target = e.target as HTMLElement
    
    // Check for rotation handles
    if (target.classList.contains('rotate-handle')) {
      e.preventDefault()
      setIsRotating(true)
      setInitialRotation(note.rotation)
    }
    // Check for resize handles
    else if (target.classList.contains('resize-handle')) {
      e.preventDefault()
      // Check if holding Alt/Option key for rotation
      if (e.altKey) {
        setIsRotating(true)
        setInitialRotation(note.rotation)
      } else {
        setIsResizing(true)
        setResizeHandle(target.dataset.handle || null)
        setInitialSize({ width: note.width, height: note.height })
        setInitialPosition({ x: note.x, y: note.y })
      }
    }
    // Regular drag
    else {
      setIsDragging(true)
    }
    
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // Calculate delta in screen coordinates, then convert to world coordinates
      // Since the world container has scale and translate transforms, we need to account for zoom
      const deltaX = (e.clientX - dragStart.x) / zoom
      const deltaY = (e.clientY - dragStart.y) / zoom
      const newX = note.x + deltaX
      const newY = note.y + deltaY
      onUpdate({ x: newX, y: newY })
      
      // Update drag start for next frame
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      })
    } else if (isResizing && resizeHandle) {
      // Calculate world delta
      const deltaX = (e.clientX - dragStart.x) / zoom
      const deltaY = (e.clientY - dragStart.y) / zoom
      
      // Convert to local coordinates (rotate by -rotation)
      const rotationRad = (-note.rotation * Math.PI) / 180
      const [deltaXL, deltaYL] = rotateVector(deltaX, deltaY, rotationRad)
      
      let newWidth = initialSize.width
      let newHeight = initialSize.height
      let newX = initialPosition.x
      let newY = initialPosition.y
      
      // Apply resize based on handle
      const minSize = 100
      
      if (resizeHandle.includes('right')) {
        newWidth = Math.max(minSize, initialSize.width + deltaXL)
      }
      if (resizeHandle.includes('left')) {
        newWidth = Math.max(minSize, initialSize.width - deltaXL)
        // Move position for left edge
        const [moveX, moveY] = rotateVector(deltaXL, 0, note.rotation * Math.PI / 180)
        newX = initialPosition.x + moveX
        newY = initialPosition.y + moveY
      }
      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(minSize, initialSize.height + deltaYL)
      }
      if (resizeHandle.includes('top')) {
        newHeight = Math.max(minSize, initialSize.height - deltaYL)
        // Move position for top edge
        const [moveX, moveY] = rotateVector(0, deltaYL, note.rotation * Math.PI / 180)
        newX = initialPosition.x + moveX
        newY = initialPosition.y + moveY
      }
      
      onUpdate({ width: newWidth, height: newHeight, x: newX, y: newY })
    } else if (isRotating) {
      // Calculate rotation based on mouse position relative to note center
      if (noteRef.current) {
        const rect = noteRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        // Calculate the angle from center to current mouse position
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
        const currentDegrees = (currentAngle * 180) / Math.PI
        
        // Calculate the angle from center to initial mouse position
        const initialAngle = Math.atan2(dragStart.y - centerY, dragStart.x - centerX)
        const initialDegrees = (initialAngle * 180) / Math.PI
        
        // Calculate the difference and apply to initial rotation
        const angleDifference = currentDegrees - initialDegrees
        const newRotation = initialRotation + angleDifference
        
        // Normalize rotation to 0-360 range
        const normalizedRotation = ((newRotation % 360) + 360) % 360
        
        // Only update if the rotation has actually changed
        if (Math.abs(normalizedRotation - note.rotation) > 0.1) {
          onUpdate({ rotation: normalizedRotation })
        }
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsRotating(false)
    setIsResizing(false)
    setResizeHandle(null)
  }

  // Add global mouse event listeners for dragging, rotating, and resizing
  useEffect(() => {
    if (isDragging || isRotating || isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          // Calculate delta in screen coordinates, then convert to world coordinates
          const deltaX = (e.clientX - dragStart.x) / zoom
          const deltaY = (e.clientY - dragStart.y) / zoom
          const newX = note.x + deltaX
          const newY = note.y + deltaY
          onUpdate({ x: newX, y: newY })
          
          // Update drag start for next frame
          setDragStart({
            x: e.clientX,
            y: e.clientY,
          })
        } else if (isResizing && resizeHandle) {
          // Calculate world delta
          const deltaX = (e.clientX - dragStart.x) / zoom
          const deltaY = (e.clientY - dragStart.y) / zoom
          
          // Convert to local coordinates (rotate by -rotation)
          const rotationRad = (-note.rotation * Math.PI) / 180
          const [deltaXL, deltaYL] = rotateVector(deltaX, deltaY, rotationRad)
          
          let newWidth = initialSize.width
          let newHeight = initialSize.height
          let newX = initialPosition.x
          let newY = initialPosition.y
          
          // Apply resize based on handle
          const minSize = 100
          
          if (resizeHandle.includes('right')) {
            newWidth = Math.max(minSize, initialSize.width + deltaXL)
          }
          if (resizeHandle.includes('left')) {
            newWidth = Math.max(minSize, initialSize.width - deltaXL)
            // Move position for left edge
            const [moveX, moveY] = rotateVector(deltaXL, 0, note.rotation * Math.PI / 180)
            newX = initialPosition.x + moveX
            newY = initialPosition.y + moveY
          }
          if (resizeHandle.includes('bottom')) {
            newHeight = Math.max(minSize, initialSize.height + deltaYL)
          }
          if (resizeHandle.includes('top')) {
            newHeight = Math.max(minSize, initialSize.height - deltaYL)
            // Move position for top edge
            const [moveX, moveY] = rotateVector(0, deltaYL, note.rotation * Math.PI / 180)
            newX = initialPosition.x + moveX
            newY = initialPosition.y + moveY
          }
          
          onUpdate({ width: newWidth, height: newHeight, x: newX, y: newY })
        } else if (isRotating) {
          // Calculate rotation based on mouse position relative to note center
          if (noteRef.current) {
            const rect = noteRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            
            // Calculate the angle from center to current mouse position
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
            const currentDegrees = (currentAngle * 180) / Math.PI
            
            // Calculate the angle from center to initial mouse position
            const initialAngle = Math.atan2(dragStart.y - centerY, dragStart.x - centerX)
            const initialDegrees = (initialAngle * 180) / Math.PI
            
            // Calculate the difference and apply to initial rotation
            const angleDifference = currentDegrees - initialDegrees
            const newRotation = initialRotation + angleDifference
            
            // Normalize rotation to 0-360 range
            const normalizedRotation = ((newRotation % 360) + 360) % 360
            
            // Only update if the rotation has actually changed
            if (Math.abs(normalizedRotation - note.rotation) > 0.1) {
              onUpdate({ rotation: normalizedRotation })
            }
          }
        }
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        setIsRotating(false)
        setIsResizing(false)
        setResizeHandle(null)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, isRotating, isResizing, resizeHandle, dragStart, note.x, note.y, note.rotation, note.width, note.height, initialRotation, initialSize, initialPosition, zoom, onUpdate])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSelectMode) {
      setIsEditing(true)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const handleContentBlur = () => {
    setIsEditing(false)
    if (content !== note.content) {
      onUpdate({ content })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      setIsEditing(false)
      if (content !== note.content) {
        onUpdate({ content })
      }
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setContent(note.content)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  const handleColorChange = (color: string) => {
    onUpdate({ color })
  }

  // Position notes in world coordinates (the transform container handles viewport and zoom)
  const worldX = note.x
  const worldY = note.y

  return (
    <motion.div
      ref={noteRef}
      className={`absolute p-3 rounded-lg border-2 shadow-lg cursor-move select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: worldX,
        top: worldY,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        color: note.color === '#000000' ? '#ffffff' : '#000000',
        borderColor: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.1)',
        zIndex: isDragging || isRotating || isResizing ? 1000 : 10,
        transformOrigin: 'center',
      }}
      animate={{
        rotate: note.rotation,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseLeave={(e) => {
        if (!isColorPickerHovered) {
          setIsHovered(false)
        }
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      drag={false} // We handle drag manually
    >
      {/* Color picker (appears when active) */}
      {isActive && !isSelectMode && (
        <div 
          className="absolute -top-8 left-0 flex gap-1 p-1 bg-background border border-border rounded shadow-lg z-50"
          onMouseEnter={() => setIsColorPickerHovered(true)}
          onMouseLeave={() => setIsColorPickerHovered(false)}
        >
          {[
            '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9',
            '#bae1ff', '#e0bbff', '#ffffff', '#000000'
          ].map((color) => (
            <button
              key={color}
              onClick={(e) => {
                e.stopPropagation()
                handleColorChange(color)
              }}
              className="w-6 h-6 rounded-none border-2 flex items-center justify-center hover:scale-110 transition-transform"
              style={{ 
                backgroundColor: color,
                borderColor: note.color === color ? "#000" : (color === "#ffffff" || color === "#000000") ? "#e5e5e5" : "transparent"
              }}
              title={`Change to ${color}`}
            >
              {note.color === color && (
                <Check className="h-3 w-3 text-black" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Delete button (appears when active) */}
      {isActive && !isSelectMode && (
        <Button
          size="icon"
          className="absolute top-2 right-2 w-7 h-7 p-0 border-2 border-red-500 text-red-500 hover:bg-red-50 bg-transparent"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Resize handles (appears when active) */}
      {isActive && !isSelectMode && (
        <>
          {/* Corner resize handles */}
          <div className="resize-handle absolute -top-1 -left-1 w-3 h-3 bg-foreground border border-border cursor-nw-resize hover:bg-accent transition-colors" data-handle="top-left" title="Resize (hold Alt to rotate)" />
          <div className="resize-handle absolute -top-1 -right-1 w-3 h-3 bg-foreground border border-border cursor-ne-resize hover:bg-accent transition-colors" data-handle="top-right" title="Resize (hold Alt to rotate)" />
          <div className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 bg-foreground border border-border cursor-sw-resize hover:bg-accent transition-colors" data-handle="bottom-left" title="Resize (hold Alt to rotate)" />
          <div className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-foreground border border-border cursor-se-resize hover:bg-accent transition-colors" data-handle="bottom-right" title="Resize (hold Alt to rotate)" />
          
          {/* Side resize handles */}
          <div className="resize-handle absolute -top-1 left-0 right-0 h-1 bg-foreground border-t border-border cursor-n-resize hover:bg-accent transition-colors" data-handle="top" title="Resize height" />
          <div className="resize-handle absolute -bottom-1 left-0 right-0 h-1 bg-foreground border-b border-border cursor-s-resize hover:bg-accent transition-colors" data-handle="bottom" title="Resize height" />
          <div className="resize-handle absolute -left-1 top-0 bottom-0 w-1 bg-foreground border-l border-border cursor-w-resize hover:bg-accent transition-colors" data-handle="left" title="Resize width" />
          <div className="resize-handle absolute -right-1 top-0 bottom-0 w-1 bg-foreground border-r border-border cursor-e-resize hover:bg-accent transition-colors" data-handle="right" title="Resize width" />
          
          {/* Invisible larger hit areas for side handles */}
          <div className="resize-handle absolute -top-1 left-0 right-0 h-5 cursor-n-resize" data-handle="top" style={{ background: 'transparent' }} />
          <div className="resize-handle absolute -bottom-1 left-0 right-0 h-5 cursor-s-resize" data-handle="bottom" style={{ background: 'transparent' }} />
          <div className="resize-handle absolute -left-1 top-0 bottom-0 w-5 cursor-w-resize" data-handle="left" style={{ background: 'transparent' }} />
          <div className="resize-handle absolute -right-1 top-0 bottom-0 w-5 cursor-e-resize" data-handle="right" style={{ background: 'transparent' }} />
          
          {/* Rotation handles (green L-shaped, outside corners) */}
          <div 
            className="rotate-handle absolute -top-2 -left-2 w-6 h-6 cursor-grab hover:scale-110 transition-transform" 
            data-handle="top-left"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #22c55e 50%, transparent 50%, transparent 100%)',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 40%, 40% 40%, 40% 100%, 0% 100%)'
            }}
            title="Rotate (hold and drag)"
          />
          <div 
            className="rotate-handle absolute -top-2 -right-2 w-6 h-6 cursor-grab hover:scale-110 transition-transform" 
            data-handle="top-right"
            style={{
              background: 'linear-gradient(225deg, #22c55e 0%, #22c55e 50%, transparent 50%, transparent 100%)',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 60% 100%, 60% 40%, 0% 40%)'
            }}
            title="Rotate (hold and drag)"
          />
          <div 
            className="rotate-handle absolute -bottom-2 -left-2 w-6 h-6 cursor-grab hover:scale-110 transition-transform" 
            data-handle="bottom-left"
            style={{
              background: 'linear-gradient(45deg, #22c55e 0%, #22c55e 50%, transparent 50%, transparent 100%)',
              clipPath: 'polygon(0% 0%, 40% 0%, 40% 60%, 100% 60%, 100% 100%, 0% 100%)'
            }}
            title="Rotate (hold and drag)"
          />
          <div 
            className="rotate-handle absolute -bottom-2 -right-2 w-6 h-6 cursor-grab hover:scale-110 transition-transform" 
            data-handle="bottom-right"
            style={{
              background: 'linear-gradient(315deg, #22c55e 0%, #22c55e 50%, transparent 50%, transparent 100%)',
              clipPath: 'polygon(60% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 60%, 60% 60%)'
            }}
            title="Rotate (hold and drag)"
          />
          
        </>
      )}

      {/* Content */}
      {isEditing ? (
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onBlur={handleContentBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full resize-none border-none bg-transparent p-0 font-mono text-sm focus:outline-none"
          style={{
            color: note.color === '#000000' ? '#ffffff' : '#000000',
            height: '100%',
          }}
        />
      ) : (
        <div className="font-mono text-sm whitespace-pre-wrap break-words h-full overflow-hidden">
          {note.content || 'Double-click to edit'}
        </div>
      )}

      {/* Selection indicator */}
      {isSelectMode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      )}
    </motion.div>
  )
}
