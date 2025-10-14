"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeleteZoneProps {
  isVisible: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function DeleteZone({ isVisible, isHovered, onMouseEnter, onMouseLeave }: DeleteZoneProps) {
  if (!isVisible) return null

  return (
    <div
      data-delete-zone
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
        "flex items-center justify-center",
        "bg-red-500 text-white rounded-lg px-6 py-4",
        "transition-all duration-200 ease-in-out",
        "font-mono text-sm font-medium",
        isHovered 
          ? "scale-110 shadow-lg shadow-red-500/50" 
          : "scale-100 shadow-md"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      <span>Drop here to delete</span>
    </div>
  )
}
