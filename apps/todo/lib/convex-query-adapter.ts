"use client"

import { useQuery } from "convex/react"
import { useQuery as useRQ, useQueryClient } from "@tanstack/react-query"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useEffect, useMemo } from "react"

export interface Task {
  id: string;
  clientId: string;
  _id?: Id<"tasks">;
  title: string;
  description: string;
  color: string;
  dueDate: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

// Last Known Good cache using localStorage
const LKG_CACHE_PREFIX = "todo:tasks:lkg"
const ANONYMOUS_CACHE_KEY = "anonymous"

const buildCacheKey = (identifier?: string | null) =>
  `${LKG_CACHE_PREFIX}:${identifier ?? ANONYMOUS_CACHE_KEY}`

function getCachedTasks(cacheKey: string): Task[] {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return []
    const parsed = JSON.parse(cached)
    // Validate cache age (max 24 hours)
    if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      return parsed.tasks || []
    }
    return []
  } catch {
    return []
  }
}

function setCachedTasks(cacheKey: string, tasks: Task[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        tasks,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore storage errors
  }
}

function formatDate(date: Date): string {
  // Format date in user's local timezone (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromConvexTask(task: Doc<"tasks">): Task {
  // Handle migration from section to dueDate
  let dueDate = task.dueDate;
  const legacySection = (task as { section?: unknown }).section;
  if (
    !dueDate &&
    typeof legacySection === "string" &&
    legacySection.startsWith("day-")
  ) {
    const daysFromNow = parseInt(legacySection.replace("day-", ""));
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    dueDate = formatDate(date);
  }
  if (!dueDate) {
    dueDate = formatDate(new Date()); // Default to today
  }

  return {
    id: task._id,
    _id: task._id,
    clientId: task.clientId,
    title: task.title,
    description: task.description,
    color: task.color,
    dueDate: dueDate,
    completed: task.completed,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

/**
 * Bridge hook that combines Convex realtime subscriptions with TanStack Query caching
 * This maintains Convex's realtime capabilities while providing instant cache access
 */
export function clearCachedTasks(identifier?: string | null): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(buildCacheKey(identifier))
  } catch {
    // Ignore storage errors
  }
}

export function useTasks(userIdentifier?: string | null) {
  const queryClient = useQueryClient()
  const cacheKey = buildCacheKey(userIdentifier)

  // 1) Get live data from Convex (this maintains realtime subscription)
  const convexTaskDocs = useQuery(api.tasks.getTasks) as Doc<"tasks">[] | undefined

  // Convert Convex docs to Task format
  const convexTasks = useMemo(() => {
    if (!convexTaskDocs) return null
    return convexTaskDocs.map(fromConvexTask)
  }, [convexTaskDocs])

  // 2) Get cached tasks from localStorage (Last Known Good)
  const cachedTasks = useMemo(() => getCachedTasks(cacheKey), [cacheKey])

  // 3) TanStack Query for cross-page cache and loading states
  const { data: rqTasks } = useRQ({
    queryKey: ["tasks"],
    queryFn: async () => {
      // This function is mainly for initial hydration
      // Real data comes from Convex subscription
      return convexTasks || cachedTasks
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
    enabled: false, // We'll push into cache from Convex instead of fetching
    initialData: cachedTasks.length > 0 ? cachedTasks : undefined,
    placeholderData: cachedTasks.length > 0 ? cachedTasks : undefined,
  })

  // 4) Keep TanStack cache synced with Convex live data
  useEffect(() => {
    if (convexTasks) {
      queryClient.setQueryData(["tasks"], convexTasks)
      // Also update LKG cache
      setCachedTasks(cacheKey, convexTasks)
    }
  }, [cacheKey, convexTasks, queryClient])

  // 5) Return the best available data
  // Priority: Convex live data > TanStack cache > LKG cache
  const tasks = convexTasks ?? rqTasks ?? cachedTasks

  return {
    tasks,
    isLoading: convexTaskDocs === undefined && cachedTasks.length === 0,
    isFetching: convexTaskDocs === undefined,
    isRealtime: convexTasks !== null,
  }
}

