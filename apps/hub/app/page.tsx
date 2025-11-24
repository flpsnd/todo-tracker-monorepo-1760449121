"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { AppCard } from "@/components/app-card"
import dynamic from "next/dynamic"

const ClientBottomBar = dynamic(() => import("@/components/client-bottom-bar").then(mod => ({ default: mod.ClientBottomBar })), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-4 md:px-0 z-50">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-start">
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
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header>
        <div className="max-w-2xl mx-auto py-6 px-4 md:px-0">
          <div className="flex items-center justify-between">
            <h1 className="font-mono text-2xl font-bold text-foreground">
              Caalm
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto pb-12 pt-4">
        {/* Hero Section */}
        <section className="mb-12 px-4 md:px-0">
          <p className="font-mono text-lg text-muted-foreground leading-relaxed">
            Suite of thoughtfully crafted productivity tools designed for simplicity and focus.
          </p>
        </section>

        {/* Apps Grid */}
        <section className="px-4 md:px-0">
          <div className="space-y-6">
            
            <AppCard
              title="Tasks"
              description="A simple task list to keep you organized every day. No clutter, just get things done easily."
              href="https://tasks.caalm.app"
            />
            
            <AppCard
              title="Journal"
              description="A simple place to write and save your notes or journal entries. Made for easy, calm writing."
              href="https://journal.caalm.app"
            />
          </div>
        </section>
      </main>

      {/* Bottom Bar */}
      <ClientBottomBar />
    </div>
  )
}
