"use client"

import { ReactNode, Suspense } from "react"
import { useSession } from "@/lib/auth-client"
import { TasksSkeleton } from "./tasks-skeleton"

function AuthContent({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  // Show loading skeleton while auth is being checked (only when truly loading and no session)
  // This ensures the page doesn't render until auth state is determined
  if (isPending && !session) {
    return (
      <div className="min-h-screen bg-background p-8 pb-24">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          </div>
          <TasksSkeleton />
        </div>
      </div>
    )
  }

  // Once auth is ready (session loaded or determined to be null), render children
  // This ensures the page component receives a determined auth state
  return <>{children}</>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-8 pb-24">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            </div>
            <TasksSkeleton />
          </div>
        </div>
      }
    >
      <AuthContent>{children}</AuthContent>
    </Suspense>
  )
}

