"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
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
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [content, setContent] = useState(note.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)

  // Update content when note changes
  useEffect(() => {
    setContent(note.content)
  }, [note.content])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isSelectMode) {
      onSelect(!isSelected)
      return
    }

    // Check if clicking on a corner handle
    const target = e.target as HTMLElement
    if (target.classList.contains('corner-handle')) {
      setIsRotating(true)
    } else {
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
    } else if (isRotating) {
      // Calculate rotation based on mouse position relative to note center
      if (noteRef.current) {
        const rect = noteRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
        const degrees = (angle * 180) / Math.PI
        const newRotation = degrees
        
        onUpdate({ rotation: newRotation })
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsRotating(false)
  }

  // Add global mouse event listeners for dragging and rotating
  useEffect(() => {
    if (isDragging || isRotating) {
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
        } else if (isRotating) {
          // Calculate rotation based on mouse position relative to note center
          if (noteRef.current) {
            const rect = noteRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
            const degrees = (angle * 180) / Math.PI
            const newRotation = degrees
            
            onUpdate({ rotation: newRotation })
          }
        }
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        setIsRotating(false)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, isRotating, dragStart, note.x, note.y, note.rotation, zoom, onUpdate])

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
      className={`absolute min-w-[200px] max-w-[300px] min-h-[150px] p-3 rounded-lg border-2 shadow-lg cursor-move select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: worldX,
        top: worldY,
        backgroundColor: note.color,
        color: note.color === '#000000' ? '#ffffff' : '#000000',
        borderColor: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.1)',
        zIndex: isDragging || isRotating ? 1000 : 10,
        transform: `rotate(${note.rotation}deg)`,
        transformOrigin: 'center',
      }}
      onMouseDown={handleMouseDown}
      onMouseLeave={(e) => {
        setIsHovered(false)
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      drag={false} // We handle drag manually
    >
      {/* Color picker (appears on hover) */}
      {isHovered && !isSelectMode && (
        <div className="absolute -top-8 left-0 flex gap-1 p-1 bg-background border border-border rounded shadow-lg">
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
              className="w-4 h-4 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={`Change to ${color}`}
            />
          ))}
        </div>
      )}

      {/* Delete button (appears on hover) */}
      {isHovered && !isSelectMode && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Corner handles for rotation (appears on hover) */}
      {isHovered && !isSelectMode && (
        <>
          <div className="corner-handle absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-grab hover:bg-blue-600 transition-colors" />
          <div className="corner-handle absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-grab hover:bg-blue-600 transition-colors" />
          <div className="corner-handle absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-grab hover:bg-blue-600 transition-colors" />
          <div className="corner-handle absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-grab hover:bg-blue-600 transition-colors" />
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
          className="w-full min-h-[60px] resize-none border-none bg-transparent p-0 font-mono text-sm focus:outline-none"
          style={{
            color: note.color === '#000000' ? '#ffffff' : '#000000',
          }}
        />
      ) : (
        <div className="font-mono text-sm whitespace-pre-wrap break-words">
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
