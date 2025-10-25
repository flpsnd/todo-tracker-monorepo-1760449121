"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COLORS } from "@/lib/colors"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  currentColor: string
  onColorChange: (color: string) => void
  onOpenChange?: (open: boolean) => void
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  trigger?: React.ReactNode
  className?: string
}

export function ColorPicker({ 
  currentColor, 
  onColorChange, 
  onOpenChange,
  align = "center",
  side = "bottom",
  trigger,
  className 
}: ColorPickerProps) {
  const selectedColor = COLORS.find(color => color.value === currentColor)

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 w-8 rounded-full p-0 border-2", className)}
            style={{
              backgroundColor: currentColor,
              borderColor: "black",
            }}
          >
            <span className="sr-only">Change color</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-auto p-2">
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className="p-1 focus:bg-accent"
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all hover:scale-110",
                  currentColor === color.value ? "border-black" : "border-gray-300 dark:border-gray-600"
                )}
                style={{
                  backgroundColor: color.value,
                }}
              >
                {currentColor === color.value && (
                  <Check className="h-3 w-3 text-black" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
