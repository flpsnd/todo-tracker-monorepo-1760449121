"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { COLORS } from "@/lib/colors"

interface TaskFormProps {
  onSubmit: (task: { title: string; description: string; color: string }) => void
}

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value)
  const [titleError, setTitleError] = useState("")
  const [descriptionError, setDescriptionError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setTitleError("")
    setDescriptionError("")
    
    // Validation
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError("Title is required")
      return
    }
    
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setTitleError(`Title must be ${MAX_TITLE_LENGTH} characters or less`)
      return
    }
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`)
      return
    }

    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      color: selectedColor,
    })

    setTitle("")
    setDescription("")
    setSelectedColor(COLORS[0].value)
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= MAX_TITLE_LENGTH) {
      setTitle(value)
      setTitleError("")
    } else {
      setTitleError(`Title must be ${MAX_TITLE_LENGTH} characters or less`)
    }
  }
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value)
      setDescriptionError("")
    } else {
      setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <form onSubmit={handleSubmit} className="">
        <div className="flex gap-4">
        {/* Left side: Title, Description, and Button */}
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="title" className="font-mono text-xs font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="Enter task title"
              className="font-mono text-base"
              style={{ fontSize: '14px' }}
              maxLength={MAX_TITLE_LENGTH}
            />
            {titleError && (
              <p className="text-xs text-red-600 font-mono">{titleError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="font-mono text-xs font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Enter task description"
              className="min-h-12 resize-none font-mono text-base"
              style={{ fontSize: '14px' }}
              rows={2}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            {descriptionError && (
              <p className="text-xs text-red-600 font-mono">{descriptionError}</p>
            )}
          </div>

          <Button type="submit" className="px-4 py-2 font-mono text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs font-medium">Color</label>
          <div className="grid grid-cols-2 gap-2 h-fit">
            {COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className="h-7 w-7 rounded-md border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color.value,
                  borderColor: selectedColor === color.value 
                    ? "#000" 
                    : (color.value === "#ffffff" || color.value === "#000000") 
                      ? "#e5e5e5" 
                      : "transparent",
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>
      </form>
    </motion.div>
  )
}
