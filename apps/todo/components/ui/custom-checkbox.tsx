"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomCheckboxProps {
  checked: boolean
  onChange: () => void
  className?: string
}

export function CustomCheckbox({ checked, onChange, className }: CustomCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "h-4 w-4 border-2 border-black bg-white flex items-center justify-center transition-colors",
        checked && "bg-black border-black",
        className
      )}
    >
      {checked && (
        <Check className="h-3 w-3 text-white" />
      )}
    </button>
  )
}
