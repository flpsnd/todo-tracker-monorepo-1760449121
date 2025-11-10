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
const LKG_CACHE_KEY = "todo:tasks:lkg"

function getCachedTasks(): Task[] {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem(LKG_CACHE_KEY)
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

function setCachedTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      LKG_CACHE_KEY,
      JSON.stringify({
        tasks,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore storage errors
  }
}

function fromConvexTask(task: Doc<"tasks">): Task {
  // Handle migration from section to dueDate
  let dueDate = task.dueDate;
  if (!dueDate && (task as any).section && (task as any).section.startsWith('day-')) {
    const daysFromNow = parseInt((task as any).section.replace('day-', ''));
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    dueDate = date.toISOString().split('T')[0];
  }
  if (!dueDate) {
    dueDate = new Date().toISOString().split('T')[0]; // Default to today
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
export function useTasks() {
  const queryClient = useQueryClient()

  // 1) Get live data from Convex (this maintains realtime subscription)
  const convexTaskDocs = useQuery(api.tasks.getTasks) as Doc<"tasks">[] | undefined

  // Convert Convex docs to Task format
  const convexTasks = useMemo(() => {
    if (!convexTaskDocs) return null
    return convexTaskDocs.map(fromConvexTask)
  }, [convexTaskDocs])

  // 2) Get cached tasks from localStorage (Last Known Good)
  const cachedTasks = useMemo(() => getCachedTasks(), [])

  // 3) TanStack Query for cross-page cache and loading states
  const { data: rqTasks, isLoading, isFetching } = useRQ({
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
      setCachedTasks(convexTasks)
    }
  }, [convexTasks, queryClient])

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

