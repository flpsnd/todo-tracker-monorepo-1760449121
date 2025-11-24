"use client"

import { ReactNode, Suspense } from "react"
import { useSession } from "@/lib/auth-client"

function AuthContent({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  // Show loading state while auth is being checked
  if (isPending && !session) {
    return (
      <div className="min-h-screen bg-background p-8 pb-24">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Once auth is ready, render children
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
          </div>
        </div>
      }
    >
      <AuthContent>{children}</AuthContent>
    </Suspense>
  )
}




