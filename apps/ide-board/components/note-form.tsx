"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"

interface Color {
  name: string
  value: string
  textColor: string
}

interface NoteFormProps {
  onSubmit: (note: { content: string; color: string; rotation: number }) => void
  onClose: () => void
  colors: Color[]
}

export function NoteForm({ onSubmit, onClose, colors }: NoteFormProps) {
  const [content, setContent] = useState("")
  const [selectedColor, setSelectedColor] = useState(colors[0].value)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      color: selectedColor,
      rotation: 0,
    })

    setContent("")
    setSelectedColor(colors[0].value)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-mono">Add New Note</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content" className="font-mono text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter note content..."
              className="min-h-[100px] resize-none font-mono text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-sm font-medium">Color</label>
            <div className="grid grid-cols-4 gap-2 max-w-[280px]">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className="h-6 w-6 rounded border-2 transition-all hover:scale-110"
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

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 font-mono">
              Add Note
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-mono"
            >
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
