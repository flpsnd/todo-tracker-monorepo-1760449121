"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { COLORS } from "@/lib/colors"

interface TaskFormProps {
  onSubmit: (task: { title: string; description: string; color: string }) => void
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title,
      description,
      color: selectedColor,
    })

    setTitle("")
    setDescription("")
    setSelectedColor(COLORS[0].value)
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="font-mono text-xs font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              className="min-h-12 resize-none font-mono text-sm"
              rows={2}
            />
          </div>

          <Button type="submit" className="w-1/4 font-mono text-sm">
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
