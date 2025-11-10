"use client"

export function TasksSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border p-4 px-4 py-7 animate-pulse"
          style={{ backgroundColor: "#f0f0f0" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border border-border bg-muted" />
            <div className="flex-1 space-y-2.5">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2 ml-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

