"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomCheckboxProps {
  checked: boolean
  onChange: () => void
  className?: string
  variant?: 'default' | 'red'
}

export function CustomCheckbox({ checked, onChange, className, variant = 'default' }: CustomCheckboxProps) {
  const isRed = variant === 'red'
  
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "h-4 w-4 border-2 flex items-center justify-center transition-colors",
        isRed 
          ? "border-red-500 hover:border-red-600" 
          : "border-black",
        checked 
          ? (isRed ? "bg-red-500 border-red-500" : "bg-black border-black")
          : "bg-white/50",
        className
      )}
    >
      {checked && (
        <Check className="h-3 w-3 text-white" />
      )}
    </button>
  )
}
