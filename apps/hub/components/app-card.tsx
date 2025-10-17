"use client"

import { Button } from "@/components/ui/button"

interface AppCardProps {
  title: string
  description: string
  href: string
}

export function AppCard({ title, description, href }: AppCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="rounded-lg border border-border p-6 transition-all duration-200 hover:bg-black/20 dark:hover:bg-white/20">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-mono font-medium text-lg text-foreground">
              {title}
            </h3>
            <p className="font-mono text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          
          <div className="flex justify-start">
            <Button 
              variant="default" 
              size="sm"
            >
              Open app
            </Button>
          </div>
        </div>
      </div>
    </a>
  )
}
