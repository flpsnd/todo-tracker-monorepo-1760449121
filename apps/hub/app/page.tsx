"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { AppCard } from "@/components/app-card"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-mono text-2xl font-bold text-foreground">
              Caalm
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <p className="font-mono text-lg text-muted-foreground leading-relaxed">
            In a world full of distractions, clarity is a luxury. Caalm is a suite of 
            thoughtfully crafted productivity tools designed for focus, simplicity, and calm.
          </p>
        </section>

        {/* Apps Grid */}
        <section>
          <div className="space-y-6">
            <h2 className="font-mono text-xl font-medium text-foreground mb-8">
              Our Apps
            </h2>
            
            <AppCard
              title="Tasks"
              description="A simple but effective todolist with drag & drop organization, color-coded tasks, and local-first sync capabilities."
              href="https://tasks.caalm.app"
            />
          </div>
        </section>
      </main>
    </div>
  )
}
