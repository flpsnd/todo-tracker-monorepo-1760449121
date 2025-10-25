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
          ? "border-black dark:border-white hover:border-black/80 dark:hover:border-white/80" 
          : "border-black",
        checked 
          ? (isRed ? "bg-black dark:bg-white border-black dark:border-white" : "bg-black border-black")
          : "bg-white/50",
        className
      )}
    >
      {checked && (
        <Check className={cn(
          "h-3 w-3",
          isRed ? "text-white dark:text-black" : "text-white"
        )} />
      )}
    </button>
  )
}
