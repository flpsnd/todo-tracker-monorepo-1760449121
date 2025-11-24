"use client"

import { useQuery } from "convex/react"
import { useQuery as useRQ, useQueryClient } from "@tanstack/react-query"
import { api } from "@/convex/_generated/api"
import { Doc } from "@/convex/_generated/dataModel"
import { useEffect, useMemo } from "react"
import type { Note } from "@/lib/local-storage"

// Last Known Good cache using localStorage
const LKG_CACHE_KEY = "notes:journalNotes:lkg"

function getCachedNotes(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem(LKG_CACHE_KEY)
    if (!cached) return []
    const parsed = JSON.parse(cached)
    // Validate cache age (max 24 hours)
    if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      return parsed.notes || []
    }
    return []
  } catch {
    return []
  }
}

function setCachedNotes(notes: Note[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      LKG_CACHE_KEY,
      JSON.stringify({
        notes,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore storage errors
  }
}

function fromConvexNote(note: Doc<"journalNotes">): Note {
  return {
    id: note._id, // Use Convex ID as the note ID (primary identifier)
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

/**
 * Bridge hook that combines Convex realtime subscriptions with TanStack Query caching
 * This maintains Convex's realtime capabilities while providing instant cache access
 */
export function useJournalNotes() {
  const queryClient = useQueryClient()

  // 1) Get live data from Convex (this maintains realtime subscription)
  const convexNoteDocs = useQuery(api.journalNotes.getJournalNotes) as Doc<"journalNotes">[] | undefined

  // Convert Convex docs to Note format
  const convexNotes = useMemo(() => {
    if (!convexNoteDocs) return null
    return convexNoteDocs.map(fromConvexNote)
  }, [convexNoteDocs])

  // 2) Get cached notes from localStorage (Last Known Good)
  const cachedNotes = useMemo(() => getCachedNotes(), [])

  // 3) TanStack Query for cross-page cache and loading states
  const { data: rqNotes } = useRQ({
    queryKey: ["journalNotes"],
    queryFn: async () => {
      // This function is mainly for initial hydration
      // Real data comes from Convex subscription
      return convexNotes || cachedNotes
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
    enabled: false, // We'll push into cache from Convex instead of fetching
    initialData: cachedNotes.length > 0 ? cachedNotes : undefined,
    placeholderData: cachedNotes.length > 0 ? cachedNotes : undefined,
  })

  // 4) Keep TanStack cache synced with Convex live data
  useEffect(() => {
    if (convexNotes) {
      queryClient.setQueryData(["journalNotes"], convexNotes)
      // Also update LKG cache
      setCachedNotes(convexNotes)
    }
  }, [convexNotes, queryClient])

  // 5) Return the best available data
  // Priority: Convex live data > TanStack cache > LKG cache
  const notes = convexNotes ?? rqNotes ?? cachedNotes

  return {
    notes,
    isLoading: convexNoteDocs === undefined && cachedNotes.length === 0,
    isFetching: convexNoteDocs === undefined,
    isRealtime: convexNotes !== null,
  }
}

