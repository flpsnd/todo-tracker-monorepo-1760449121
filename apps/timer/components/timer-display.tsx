"use client"

import { useState, useRef, useEffect } from "react"
import { formatTime } from "@/lib/local-storage"
import { Button } from "@/components/ui/button"

interface TimerDisplayProps {
  timeRemaining: number
  onTimeChange: (newTime: number) => void
  isRunning: boolean
}

export function TimerDisplay({ timeRemaining, onTimeChange, isRunning }: TimerDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [timeFormat, setTimeFormat] = useState<'HH:MM' | 'MM:SS'>('MM:SS')
  const [editingDigit, setEditingDigit] = useState(0)
  
  // Character-by-character input states
  const [digit0, setDigit0] = useState("")
  const [digit1, setDigit1] = useState("")
  const [digit2, setDigit2] = useState("")
  const [digit3, setDigit3] = useState("")
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ]

  // Initialize digits when editing starts
  useEffect(() => {
    if (isEditing) {
      const time = formatTime(timeRemaining)
      const [left, right] = time.split(':')
      setDigit0(left[0] || '')
      setDigit1(left[1] || '')
      setDigit2(right[0] || '')
      setDigit3(right[1] || '')
      
      // Set format based on current time
      const totalSeconds = Math.floor(timeRemaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      setTimeFormat(hours > 0 ? 'HH:MM' : 'MM:SS')
      
      // Focus the first digit
      setTimeout(() => {
        inputRefs[0].current?.focus()
      }, 0)
    }
  }, [isEditing, timeRemaining])

  // Helper function to get current digit value
  const getDigitValue = (index: number): string => {
    switch(index) {
      case 0: return digit0
      case 1: return digit1
      case 2: return digit2
      case 3: return digit3
      default: return ''
    }
  }

  // Handle individual digit input with auto-advance
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newValue = value.slice(-1) // Take only last character
    
    // Update the appropriate digit state
    switch(index) {
      case 0: setDigit0(newValue); break
      case 1: setDigit1(newValue); break
      case 2: setDigit2(newValue); break
      case 3: setDigit3(newValue); break
    }
    
    // Auto-advance to next input if digit entered
    if (newValue && index < 3) {
      setTimeout(() => {
        inputRefs[index + 1].current?.focus()
      }, 0)
    }
  }

  // Handle backspace to go to previous input
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !getDigitValue(index) && index > 0) {
      inputRefs[index - 1].current?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      resetDigits()
    }
  }

  const handleDigitClick = (index: number) => {
    if (!isRunning) {
      setIsEditing(true)
      setEditingDigit(index)
    }
  }

  const handleSubmit = () => {
    // Construct time from digit states
    const leftPair = digit0 + digit1
    const rightPair = digit2 + digit3
    
    let newTime: number | null = null
    
    if (timeFormat === 'HH:MM') {
      const hours = parseInt(leftPair, 10)
      const minutes = parseInt(rightPair, 10)
      if (hours >= 0 && hours <= 99 && minutes >= 0 && minutes <= 59) {
        newTime = hours * 3600000 + minutes * 60000
      }
    } else {
      const minutes = parseInt(leftPair, 10)
      const seconds = parseInt(rightPair, 10)
      if (minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59) {
        newTime = minutes * 60000 + seconds * 1000
      }
    }
    
    if (newTime !== null && newTime > 0) {
      onTimeChange(newTime)
    }
    setIsEditing(false)
    resetDigits()
  }

  const resetDigits = () => {
    setDigit0("")
    setDigit1("")
    setDigit2("")
    setDigit3("")
  }

  const handleBlur = () => {
    // Only submit if all inputs have lost focus
    setTimeout(() => {
      if (!inputRefs.some(ref => ref.current === document.activeElement)) {
        handleSubmit()
      }
    }, 100)
  }

  const renderTimeDigits = (timeString: string) => {
    const [left, right] = timeString.split(':')
    const leftDigits = left.split('')
    const rightDigits = right.split('')
    
    return (
      <div className="flex items-center justify-center gap-5 w-full max-w-2xl">
        {/* Left pair */}
        <div className="flex items-center gap-1 flex-1">
          {leftDigits.map((digit, index) => (
            <div 
              key={index} 
              className="bg-card border border-border rounded-lg p-8 flex-1 h-28 flex items-center justify-center shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleDigitClick(index)}
            >
              <span 
                className="font-mono text-8xl font-bold text-foreground"
                style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
              >
                {digit}
              </span>
            </div>
          ))}
        </div>
        {/* Right pair */}
        <div className="flex items-center gap-1 flex-1">
          {rightDigits.map((digit, index) => (
            <div 
              key={`right-${index}`} 
              className="bg-card border border-border rounded-lg p-8 flex-1 h-28 flex items-center justify-center shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleDigitClick(index + 2)}
            >
              <span 
                className="font-mono text-8xl font-bold text-foreground"
                style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
              >
                {digit}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderEditingDigits = () => {
    return (
      <div className="w-full flex flex-col items-center gap-4 max-w-2xl">
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
        
        {/* Character-by-character input */}
        <div className="flex items-center justify-center gap-5 w-full">
          <div className="flex items-center gap-1 flex-1">
            {[0, 1].map(i => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={getDigitValue(i)}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onBlur={handleBlur}
                className="bg-card border-2 border-primary rounded-lg p-8 flex-1 h-28 text-center font-mono text-8xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 flex-1">
            {[2, 3].map(i => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={getDigitValue(i)}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onBlur={handleBlur}
                className="bg-card border-2 border-primary rounded-lg p-8 flex-1 h-28 text-center font-mono text-8xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center">
      {isEditing ? renderEditingDigits() : renderTimeDigits(formatTime(timeRemaining))}
    </div>
  )
}
