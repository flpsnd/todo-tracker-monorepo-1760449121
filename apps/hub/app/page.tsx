"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { AppCard } from "@/components/app-card"
import dynamic from "next/dynamic"

const ClientBottomBar = dynamic(() => import("@/components/client-bottom-bar").then(mod => ({ default: mod.ClientBottomBar })), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center">
            <p className="font-mono text-sm text-muted-foreground">
              Sign up for news about Caalm
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-64 h-9 bg-muted animate-pulse rounded-md"></div>
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-24">
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

      {/* Bottom Bar */}
      <ClientBottomBar />
    </div>
  )
}
