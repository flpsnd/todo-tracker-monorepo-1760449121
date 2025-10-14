"use client"

import { Reorder } from "framer-motion"
import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import type { Task } from "@/app/page"
import { TaskCard } from "@/components/task-card"

interface TaskSectionProps {
  title: string
  tasks: Task[]
  section: string
  onReorder: (section: string, newOrder: Task[]) => void
  onDragStart: (taskSection: string) => void
  onDragEnd: () => void
  onMoveToSection: (taskId: string, targetSection: string) => void
  onToggleCompletion: (taskId: string) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
  shouldShow: boolean
  isDragging: boolean
  isCurrentSection: boolean
  draggingTaskSection?: string | null
  hoveredSection?: string | null
  onSectionHover?: (section: string | null) => void
  isSelectMode?: boolean
  selectedTaskIds?: string[]
  onSelect?: (taskId: string) => void
}

export function TaskSection({
  title,
  tasks,
  section,
  onReorder,
  onDragStart,
  onDragEnd,
  onMoveToSection,
  onToggleCompletion,
  onUpdateTask,
  onDelete,
  shouldShow,
  isDragging,
  isCurrentSection,
  draggingTaskSection,
  hoveredSection,
  onSectionHover,
  isSelectMode = false,
  selectedTaskIds = [],
  onSelect,
}: TaskSectionProps) {
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced hover handler to prevent excessive state updates
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      onSectionHover?.(section)
    }, 50) // Small delay to debounce rapid hover changes
  }, [onSectionHover, section])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      onSectionHover?.(null)
    }, 100) // Slightly longer delay on leave to prevent flickering
  }, [onSectionHover])

  // Memoize the day number extraction to avoid repeated regex operations
  const getDayNumber = useCallback((sectionKey: string) => {
    const match = sectionKey.match(/day-(\d+)/)
    return match ? parseInt(match[1], 10) : -1
  }, [])

  // Memoize opacity calculation to prevent expensive recalculations on every render
  const opacity = useMemo(() => {
    if (shouldShow) return 1 // Always show sections that have tasks or are today
    
    if (!isDragging) return 0 // Hide sections when not dragging
    
    const currentDay = getDayNumber(section)
    const originalDay = draggingTaskSection ? getDayNumber(draggingTaskSection) : -1
    const hoveredDay = hoveredSection ? getDayNumber(hoveredSection) : -1
    
    // If we have both original and hovered sections, check if current is in between
    if (originalDay >= 0 && hoveredDay >= 0) {
      const minDay = Math.min(originalDay, hoveredDay)
      const maxDay = Math.max(originalDay, hoveredDay)
      
      if (currentDay === hoveredDay) {
        return 1 // Currently hovered section - full opacity
      } else if (currentDay > minDay && currentDay < maxDay) {
        return 0.5 // Sections in between - 50% opacity
      }
    }
    
    // Fallback to original behavior for edge cases
    return isHovered && !isCurrentSection ? 0.5 : 0
  }, [shouldShow, isDragging, section, draggingTaskSection, hoveredSection, isHovered, isCurrentSection, getDayNumber])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  if (opacity === 0 && !isDragging) return null

  return (
    <div
      data-section={section}
      className="transition-opacity duration-200 mt-12"
      style={{ opacity }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <h2 className="mb-4 font-mono text-xl font-semibold">{title}</h2>
      <Reorder.Group
        axis="y"
        values={tasks}
        onReorder={isSelectMode ? () => {} : (newOrder) => onReorder(section, newOrder)}
        className="space-y-3"
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={() => onDragStart(task.section)}
            onDragEnd={onDragEnd}
            onMoveToSection={onMoveToSection}
            onToggleCompletion={onToggleCompletion}
            onUpdateTask={onUpdateTask}
            onDelete={onDelete}
            currentSection={section}
            isSelectMode={isSelectMode}
            isSelected={selectedTaskIds.includes(task.id)}
            onSelect={onSelect}
          />
        ))}
      </Reorder.Group>
      {tasks.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {isDragging && isHovered ? "Drop task here" : "No tasks yet"}
          </p>
        </div>
      )}
    </div>
  )
}
