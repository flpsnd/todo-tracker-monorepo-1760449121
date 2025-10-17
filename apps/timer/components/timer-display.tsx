"use client"

import { useState, useRef, useEffect } from "react"
import { formatTime, parseTimeInput, getTimeInputPlaceholder } from "@/lib/local-storage"
import { Button } from "@/components/ui/button"

interface TimerDisplayProps {
  timeRemaining: number
  onTimeChange: (newTime: number) => void
  isRunning: boolean
}

export function TimerDisplay({ timeRemaining, onTimeChange, isRunning }: TimerDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [timeFormat, setTimeFormat] = useState<'HH:MM' | 'MM:SS'>('MM:SS')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (!isRunning) {
      setIsEditing(true)
      setInputValue(formatTime(timeRemaining))
      // Set format based on current time
      const totalSeconds = Math.floor(timeRemaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      setTimeFormat(hours > 0 ? 'HH:MM' : 'MM:SS')
    }
  }

  const handleSubmit = () => {
    // Parse input based on selected format
    let newTime: number | null = null
    
    if (timeFormat === 'HH:MM') {
      const hhmmMatch = inputValue.trim().match(/^(\d{1,2}):(\d{2})$/)
      if (hhmmMatch) {
        const hours = parseInt(hhmmMatch[1], 10)
        const minutes = parseInt(hhmmMatch[2], 10)
        if (hours >= 0 && hours <= 99 && minutes >= 0 && minutes <= 59) {
          newTime = hours * 3600000 + minutes * 60000
        }
      }
    } else {
      const mmssMatch = inputValue.trim().match(/^(\d{1,2}):(\d{2})$/)
      if (mmssMatch) {
        const minutes = parseInt(mmssMatch[1], 10)
        const seconds = parseInt(mmssMatch[2], 10)
        if (minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59) {
          newTime = minutes * 60000 + seconds * 1000
        }
      }
    }
    
    if (newTime !== null && newTime > 0) {
      onTimeChange(newTime)
    }
    setIsEditing(false)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsEditing(false)
      setInputValue("")
    }
  }

  const handleBlur = () => {
    handleSubmit()
  }

  const renderTimeDigits = (timeString: string) => {
    const digits = timeString.split('')
    const colonIndex = digits.indexOf(':')
    
    return (
      <div className="flex items-center justify-center gap-2 w-full">
        {digits.map((digit, index) => (
          <div key={index} className="flex items-center justify-center">
            {digit === ':' ? (
              <div className="w-4 h-16 flex items-center justify-center">
                <div className="w-1 h-8 bg-foreground rounded-full"></div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-4 mx-1 min-w-[4rem] h-20 flex items-center justify-center shadow-sm">
                <span 
                  className="font-mono text-6xl font-bold text-foreground"
                  style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}
                >
                  {digit}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        {/* Format selector */}
        <div className="flex gap-2">
          <Button
            variant={timeFormat === 'MM:SS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFormat('MM:SS')}
            className="font-mono"
          >
            MM:SS
          </Button>
          <Button
            variant={timeFormat === 'HH:MM' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFormat('HH:MM')}
            className="font-mono"
          >
            HH:MM
          </Button>
        </div>
        
        {/* Time input */}
        <div className="flex items-center justify-center gap-2 w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={timeFormat}
            className="font-mono text-6xl text-center bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground w-full max-w-md"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full flex justify-center cursor-pointer select-none"
      onClick={handleClick}
      title={isRunning ? "Timer is running" : "Click to set time"}
    >
      {renderTimeDigits(formatTime(timeRemaining))}
    </div>
  )
}
