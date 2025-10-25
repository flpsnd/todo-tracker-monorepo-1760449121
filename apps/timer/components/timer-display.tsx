"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface TimerDisplayProps {
  timeRemaining: number
  onTimeChange: (newTime: number) => void
  isRunning: boolean
}

export function TimerDisplay({ timeRemaining, onTimeChange, isRunning }: TimerDisplayProps) {
  const [timeFormat, setTimeFormat] = useState<'HH:MM' | 'MM:SS'>('MM:SS')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  if (inputRefs.current.length !== 4) {
    inputRefs.current = new Array(4).fill(null)
  }

  // Keep format in sync with time remaining when not editing
  useEffect(() => {
    if (activeIndex === null) {
      const totalSeconds = Math.floor(timeRemaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      setTimeFormat(hours > 0 ? 'HH:MM' : 'MM:SS')
    }
  }, [timeRemaining, activeIndex])

  const digits = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(timeRemaining / 1000))
    if (timeFormat === 'HH:MM') {
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return [
        Math.floor(hours / 10).toString(),
        (hours % 10).toString(),
        Math.floor(minutes / 10).toString(),
        (minutes % 10).toString(),
      ]
    }

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return [
      Math.floor(minutes / 10).toString(),
      (minutes % 10).toString(),
      Math.floor(seconds / 10).toString(),
      (seconds % 10).toString(),
    ]
  }, [timeRemaining, timeFormat])

  const handleDigitFocus = (index: number) => {
    if (isRunning) return
    setActiveIndex(index)
    setTimeout(() => {
      inputRefs.current[index]?.focus()
      inputRefs.current[index]?.select()
    }, 0)
  }

  const handleDigitInput = (index: number, digit: string) => {
    const newDigits = [...digits]
    newDigits[index] = digit
    commitNewTime(newDigits)

    if (index < 3) {
      handleDigitFocus(index + 1)
    } else {
      setActiveIndex(null)
    }
  }

  const commitNewTime = (updatedDigits: string[]) => {
    const leftPair = updatedDigits.slice(0, 2).join('')
    const rightPair = updatedDigits.slice(2).join('')

    let newTime: number | null = null

    if (timeFormat === 'HH:MM') {
      const hours = parseInt(leftPair, 10)
      const minutes = parseInt(rightPair, 10)
      if (!Number.isNaN(hours) && !Number.isNaN(minutes) &&
          hours >= 0 && hours <= 99 && minutes >= 0 && minutes <= 59) {
        newTime = hours * 3600000 + minutes * 60000
      }
    } else {
      const minutes = parseInt(leftPair, 10)
      const seconds = parseInt(rightPair, 10)
      if (!Number.isNaN(minutes) && !Number.isNaN(seconds) &&
          minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59) {
        newTime = minutes * 60000 + seconds * 1000
      }
    }

    if (newTime !== null && newTime > 0) {
      onTimeChange(newTime)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      handleDigitInput(index, e.key)
      return
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      handleDigitFocus(index - 1)
    }
    if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault()
      handleDigitFocus(index + 1)
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index] !== '0') {
        handleDigitInput(index, '0')
      } else if (index > 0) {
        handleDigitInput(index - 1, '0')
        handleDigitFocus(index - 1)
      }
      return
    }
    if (e.key === 'Enter') {
      setActiveIndex(null)
    }
    if (e.key === 'Escape') {
      setActiveIndex(null)
    }
  }

  const handleBlur = (index: number) => {
    setTimeout(() => {
      const isAnyFocused = inputRefs.current.some((ref) => ref === document.activeElement)
      if (!isAnyFocused) {
        setActiveIndex(null)
      }
    }, 0)
  }

  const handleFormatChange = (format: 'HH:MM' | 'MM:SS') => {
    setTimeFormat(format)
    // Don't close edit mode when changing format
  }

  const renderDigit = (digit: string, index: number) => {
    const isActive = activeIndex === index
    return (
      <div
        key={index}
        className={`relative flex-1 h-28 cursor-pointer transition-colors ${
          isActive ? 'ring-2 ring-primary' : 'ring-0'
        }`}
        onClick={() => handleDigitFocus(index)}
      >
        <div className="bg-card border border-border rounded-lg p-8 flex h-full items-center justify-center shadow-sm">
          <span
            className="font-mono text-8xl font-bold text-foreground"
            style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
          >
            {digit}
          </span>
        </div>
        <input
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="absolute inset-0 h-full w-full opacity-0 caret-transparent"
          defaultValue={digits[index]}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onBlur={() => handleBlur(index)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Format selector - always rendered to prevent layout shift */}
      <div className="flex gap-2 h-8">
        <Button
          variant={timeFormat === 'MM:SS' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFormatChange('MM:SS')}
          className="font-mono min-w-[80px] h-8"
          disabled={isRunning}
        >
          MINUTES
        </Button>
        <Button
          variant={timeFormat === 'HH:MM' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFormatChange('HH:MM')}
          className="font-mono min-w-[80px] h-8"
          disabled={isRunning}
        >
          HOURS
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full max-w-2xl">
        {digits.map((digit, index) => renderDigit(digit, index))}
      </div>
    </div>
  )
}
