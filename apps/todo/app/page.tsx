"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { ChevronDown, Eye, EyeOff, Plus } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Doc } from "@/convex/_generated/dataModel"
import { loadLocalTasks, saveLocalTasks, getDeletedTasks, addDeletedTask, removeDeletedTask, replaceTaskIds } from "@/lib/local-storage"
import { TaskForm } from "@/components/task-form"
import { TaskSection } from "@/components/task-section"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Trash2, X, RefreshCw, CheckSquare, Square } from "lucide-react"
import { ColorPicker } from "@/components/color-picker"
import { ErrorBoundary } from "@/components/error-boundary"

export interface Task {
  id: string
  _id?: string // Convex ID (only present for synced tasks)
  title: string
  description: string
  color: string
  section: string
  completed: boolean
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th'
  }
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function getDayInfo(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
  
  let title: string
  if (daysFromNow === 0) {
    title = "Tasks for today"
  } else if (daysFromNow === 1) {
    title = "Tasks for tomorrow"
  } else if (daysFromNow <= 6) {
    title = `Tasks for ${dayName}`
  } else {
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "long" })
    const ordinalSuffix = getOrdinalSuffix(day)
    title = `Tasks for ${dayName}, ${day}${ordinalSuffix} ${month}`
  }
  
  return {
    key: `day-${daysFromNow}`,
    title,
    daysFromNow,
  }
}

function fromConvexTask(task: Doc<"tasks">): Task {
  return {
    id: task._id,
    _id: task._id,
    title: task.title,
    description: task.description,
    color: task.color,
    section: task.section,
    completed: task.completed,
  }
}

function mergeTasks(remote: Task[], local: Task[]): Task[] {
  if (remote.length === 0) {
    return local
  }

  const remoteIds = new Set(remote.map((task) => task._id))
  const leftover = local.filter((task) => !task._id || !remoteIds.has(task._id))
  return [...remote, ...leftover]
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggingTaskSection, setDraggingTaskSection] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [syncStatus, setSyncStatus] = useState<"local-only" | "syncing" | "synced" | "error">("local-only")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [deletedTasksQueue, setDeletedTasksQueue] = useState<Array<{task: Task, timeoutId: NodeJS.Timeout}>>([])

  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusMode') === 'true'
    }
    return false
  })

  // Auth state - using Better Auth session
  const { data: session } = authClient.useSession()
  const hasSession = Boolean(session?.user)
  const isAuthenticated = hasSession
  const isLoading = false
  
  // Debug auth state
  useEffect(() => {
    console.log("Auth state:", { session, hasSession, user: session?.user })
    if (hasSession) {
      console.log("User is authenticated, checking Convex auth...")
      // Test if we can get the current user from Convex
      // This will help us debug if the auth is properly connected
    }
  }, [session, hasSession])

  // Convex queries and mutations
  const convexTaskDocs = useQuery(api.tasks.getTasks) as Doc<"tasks">[] | undefined
  const addTaskMutation = useMutation(api.tasks.addTask)
  const updateTaskMutation = useMutation(api.tasks.updateTask)
  const deleteTaskMutation = useMutation(api.tasks.deleteTask)
  const syncLocalTasksMutation = useMutation(api.tasks.syncLocalTasks)
  
  // Toast hook
  const { toast } = useToast()

  // Focus mode persistence
  useEffect(() => {
    localStorage.setItem('focusMode', isFocusMode.toString())
  }, [isFocusMode])

  // Focus mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsFocusMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return
    const localTasks = loadLocalTasks()
    setTasks(localTasks)
    setHasInitialized(true)
  }, [hasInitialized])

  // Handle authentication state changes
  useEffect(() => {
    if (!hasSession) {
      // OFFLINE MODE: Use local storage only
      setSyncStatus("local-only")
      setIsMigrating(false)
      return
    }

    if (convexTaskDocs === undefined) {
      // Still loading Convex data
      setSyncStatus("syncing")
      return
    }

    // Don't overwrite tasks if we're in the middle of migration
    if (isMigrating) {
      console.log("Migration in progress, keeping local tasks visible")
      return
    }

    // AUTHED MODE: Use Convex data
    const convexTasks = convexTaskDocs.map(fromConvexTask)
    setTasks(convexTasks)
    
    // Only update localStorage if we have Convex tasks (not empty)
    if (convexTasks.length > 0) {
      saveLocalTasks(convexTasks)
    }
    
    setSyncStatus("synced")
  }, [hasSession, convexTaskDocs, isMigrating])

  // One-time migration: Move local tasks to Convex when user logs in
  useEffect(() => {
    console.log("Migration effect triggered:", { 
      isAuthenticated, 
      isLoading,
      convexTaskDocs: convexTaskDocs?.length, 
      isMigrating 
    })
    
    // Wait for auth to load
    if (isLoading || convexTaskDocs === undefined) return

    const localTasks = loadLocalTasks()
    const hasLocalTasks = localTasks.length > 0
    const hasConvexTasks = convexTaskDocs.length > 0

    console.log("Migration check:", { 
      hasLocalTasks, 
      hasConvexTasks, 
      isMigrating,
      localTasksCount: localTasks.length,
      convexTasksCount: convexTaskDocs.length
    })

    // If user has local tasks but no Convex tasks, migrate them
    if (isAuthenticated && hasLocalTasks && !hasConvexTasks && !isMigrating) {
      console.log("Starting migration of local tasks to Convex...", localTasks.length)
      setIsMigrating(true)
      setSyncStatus("syncing")
      
      syncLocalTasksMutation({
        tasks: localTasks.map((task) => ({
          title: task.title,
          description: task.description,
          color: task.color,
          section: task.section,
          completed: task.completed,
        })),
      }).then(() => {
        console.log("Migration completed")
        setIsMigrating(false)
        setSyncStatus("synced")
        // Clear local storage after successful migration
        localStorage.removeItem("tasks")
        // After successful migration, the Convex query will update and we'll switch to Convex data
      }).catch((error) => {
        console.error("Migration failed:", error)
        setIsMigrating(false)
        setSyncStatus("error")
        toast({
          title: "Migration Error",
          description: "Failed to migrate tasks to cloud. Working locally.",
          variant: "destructive",
        })
      })
    }
  }, [isAuthenticated, isLoading, convexTaskDocs, syncLocalTasksMutation, toast, isMigrating])

  const addTask = useCallback(async (task: Omit<Task, "id" | "section" | "completed">) => {
    console.log("addTask called:", { isAuthenticated, task })
    
    if (isAuthenticated) {
      // AUTHED MODE: Save directly to Convex
      try {
        console.log("Attempting to add task to Convex...")
        setSyncStatus("syncing")
        const insertedId = await addTaskMutation({
          title: task.title,
          description: task.description,
          color: task.color,
          section: "day-0",
          completed: false,
        })
        
        console.log("Task added to Convex successfully:", insertedId)
        
        // Add to local state with Convex ID
        const newTask: Task = {
          id: insertedId,
          _id: insertedId,
          title: task.title,
          description: task.description,
          color: task.color,
          section: "day-0",
          completed: false,
        }
        
        setTasks((prev) => {
          const next = [...prev, newTask]
          saveLocalTasks(next)
          return next
        })
        
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to add task to Convex:", error)
        setSyncStatus("error")
        toast({
          title: "Error",
          description: "Failed to add task. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      // OFFLINE MODE: Save to local storage only
      console.log("Adding task to local storage only")
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        section: "day-0",
        completed: false,
      }
      
      setTasks((prev) => {
        const next = [...prev, newTask]
        saveLocalTasks(next)
        return next
      })
    }
  }, [isAuthenticated, addTaskMutation, toast])

  const updateTaskOrder = useCallback(async (section: string, newOrder: Task[]) => {
    setTasks((prev) => {
      const otherSectionTasks = prev.filter((t) => t.section !== section)
      const updated = newOrder.map((task) => ({ ...task, section }))
      const next = [...otherSectionTasks, ...updated]
      saveLocalTasks(next)
      return next
    })

    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        // Only sync tasks that have Convex IDs (not local UUIDs)
        for (const task of newOrder) {
          // Check if this is a Convex task (has _id field) or local task (has id field)
          if (task._id) {
        await updateTaskMutation({
          taskId: task._id as any,
          section: task.section,
        })
          }
        }
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task order:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task order. Changes saved locally.",
          variant: "destructive",
        })
      }
    }
  }, [session?.user, updateTaskMutation, toast])

  const moveTaskToSection = useCallback(async (taskId: string, targetSection: string) => {
    let movedTask: Task | undefined
    setTasks((prev) => {
      const next = prev.map((task) => {
        if (task.id === taskId) {
          movedTask = { ...task, section: targetSection }
          return movedTask
        }
        return task
      })
      saveLocalTasks(next)
      return next
    })

    if (session?.user && movedTask?._id) {
      try {
        setSyncStatus("syncing")
        await updateTaskMutation({
          taskId: movedTask._id as any,
          section: targetSection,
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task move:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task move. Changes saved locally.",
          variant: "destructive",
        })
      }
    }
  }, [session?.user, updateTaskMutation, toast])

  const toggleTaskCompletion = useCallback(async (taskId: string) => {
    let toggledTask: Task | undefined
    setTasks((prev) => {
      const next = prev.map((task) => {
        if (task.id === taskId) {
          toggledTask = { ...task, completed: !task.completed }
          return toggledTask
        }
        return task
      })
      saveLocalTasks(next)
      return next
    })

    if (session?.user && toggledTask?._id) {
      try {
        setSyncStatus("syncing")
        await updateTaskMutation({
          taskId: toggledTask._id as any,
          completed: toggledTask.completed,
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task completion:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task completion. Changes saved locally.",
          variant: "destructive",
        })
      }
    }
  }, [session?.user, updateTaskMutation, toast])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Update local state immediately
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, ...updates }
        }
        return t
      })
      saveLocalTasks(next)
      return next
    })

    // If authenticated and task has Convex ID, sync to Convex
    if (isAuthenticated && task._id) {
      try {
        setSyncStatus("syncing")
        await updateTaskMutation({
          taskId: task._id as any,
          ...updates,
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task update:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task update.",
          variant: "destructive",
        })
      }
    }
  }, [isAuthenticated, updateTaskMutation, tasks, toast])

  const deleteTask = useCallback(async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId)
    if (!taskToDelete) return
    
    // Remove from visible tasks immediately
    setTasks((prev) => prev.filter(t => t.id !== taskId))
    
    // Remove from localStorage immediately to persist deletion
    const currentTasks = loadLocalTasks()
    const filteredTasks = currentTasks.filter(t => t.id !== taskId)
    saveLocalTasks(filteredTasks)
    
    // Add to localStorage deleted tasks for restore functionality
    addDeletedTask(taskToDelete)
    
    // If authenticated and task has Convex ID, delete from Convex
    if (isAuthenticated && taskToDelete._id) {
      try {
        setSyncStatus("syncing")
        await deleteTaskMutation({ taskId: taskToDelete._id as any })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to delete task from Convex:", error)
        setSyncStatus("error")
        toast({
          title: "Delete Error",
          description: "Failed to delete task from cloud.",
          variant: "destructive",
        })
      }
    }
    
    // Set 60s timeout for permanent deletion from deleted tasks
    const timeoutId = setTimeout(() => {
      removeDeletedTask(taskId)
    }, 60000)
    
    // Add to deleted queue for timeout management
    setDeletedTasksQueue(prev => [...prev, { task: taskToDelete, timeoutId }])
    
    // Show toast with restore action
    toast({
      title: "Task deleted",
      description: taskToDelete.title,
      action: <ToastAction altText="Restore" onClick={() => restoreTask(taskId)}>Restore</ToastAction>,
      duration: 60000
    })
  }, [isAuthenticated, deleteTaskMutation, tasks, toast])

  const restoreTask = async (taskId: string) => {
    console.log("Attempting to restore task:", taskId)
    
    // Check if task is already in localStorage to prevent duplicates
    const currentLocalTasks = loadLocalTasks()
    const currentLocalTaskIds = new Set(currentLocalTasks.map(task => task.id))
    if (currentLocalTaskIds.has(taskId)) {
      console.log("Task is already restored")
      return
    }
    
    // Get deleted tasks from localStorage
    const deletedTasks = getDeletedTasks()
    const deletedItem = deletedTasks.find(item => item.task.id === taskId)
    
    if (!deletedItem) {
      console.log("Task not found in deleted tasks")
      return
    }
    
    console.log("Found deleted item:", deletedItem)
    
    // Clear timeout from React state
    const queueItem = deletedTasksQueue.find(item => item.task.id === taskId)
    if (queueItem) {
      clearTimeout(queueItem.timeoutId)
      setDeletedTasksQueue(prev => prev.filter(item => item.task.id !== taskId))
    }
    
    // Remove from localStorage deleted tasks
    removeDeletedTask(taskId)
    
    // Add task back to localStorage since it was removed during deletion
    const updatedLocalTasks = [...currentLocalTasks, deletedItem.task]
    saveLocalTasks(updatedLocalTasks)

    // Restore task to list by reloading from localStorage to ensure consistency
    const restoredLocalTasks = loadLocalTasks()
    setTasks(restoredLocalTasks)
    
    // Show success toast
    toast({
      title: "Task restored",
      description: deletedItem.task.title,
      duration: 3000
    })
  }

  const restoreBulkTasks = async (taskIds: string[]) => {
    console.log("Attempting to restore bulk tasks:", taskIds)
    
    // Get deleted tasks from localStorage
    const deletedTasks = getDeletedTasks()
    const deletedItems = deletedTasks.filter(item => taskIds.includes(item.task.id))
    
    if (deletedItems.length === 0) {
      console.log("No tasks found in deleted tasks")
      return
    }
    
    console.log("Found deleted items:", deletedItems)
    
    // Clear timeouts from React state for all tasks
    for (const taskId of taskIds) {
      const queueItem = deletedTasksQueue.find(item => item.task.id === taskId)
      if (queueItem) {
        clearTimeout(queueItem.timeoutId)
        setDeletedTasksQueue(prev => prev.filter(item => item.task.id !== taskId))
      }
    }
    
    // Remove from localStorage deleted tasks
    for (const taskId of taskIds) {
      removeDeletedTask(taskId)
    }
    
    // Get current localStorage tasks to check for duplicates
    const currentLocalTasks = loadLocalTasks()
    const currentLocalTaskIds = new Set(currentLocalTasks.map(task => task.id))
    
    // Only restore tasks that are not already in localStorage
    const restoredTasks = deletedItems
      .map(item => item.task)
      .filter(task => !currentLocalTaskIds.has(task.id))
    
    if (restoredTasks.length === 0) {
      console.log("All tasks are already restored")
      return
    }
    
    // Add tasks back to localStorage since they were removed during deletion
    const updatedLocalTasks = [...currentLocalTasks, ...restoredTasks]
    saveLocalTasks(updatedLocalTasks)

    // Restore tasks to list by reloading from localStorage to ensure consistency
    const restoredLocalTasks = loadLocalTasks()
    setTasks(restoredLocalTasks)
    
    // Show success toast
    toast({
      title: "Tasks restored",
      description: `${restoredTasks.length} task${restoredTasks.length !== 1 ? 's' : ''} restored`,
      duration: 3000
    })
  }

  // Select mode functions
  const toggleSelectMode = () => {
    if (isSelectMode) {
      // Exit select mode
      setIsSelectMode(false)
      setSelectedTaskIds([])
    } else {
      // Enter select mode
      setIsSelectMode(true)
    }
  }

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleBulkDelete = () => {
    setShowDeleteConfirmation(true)
  }

  const confirmBulkDelete = async () => {
    const selectedTasks = tasks.filter(task => selectedTaskIds.includes(task.id))
    
    if (selectedTasks.length === 0) {
      setShowDeleteConfirmation(false)
      return
    }
    
    // Store selected task IDs for bulk restore
    const deletedTaskIds = selectedTasks.map(task => task.id)
    
    // Remove all selected tasks from visible state immediately
    const updatedTasks = tasks.filter(task => !selectedTaskIds.includes(task.id))
    setTasks(updatedTasks)
    
    // Remove from localStorage immediately to persist deletion
    const currentTasks = loadLocalTasks()
    const filteredTasks = currentTasks.filter(task => !selectedTaskIds.includes(task.id))
    saveLocalTasks(filteredTasks)
    
    // Add all tasks to deleted tasks localStorage
    for (const task of selectedTasks) {
      addDeletedTask(task)
    }
    
    // Set timeouts for permanent deletion
    const timeoutIds: NodeJS.Timeout[] = []
    for (const task of selectedTasks) {
      const timeoutId = setTimeout(() => {
        // Remove from localStorage
        const currentTasks = loadLocalTasks()
        const filteredTasks = currentTasks.filter(t => t.id !== task.id)
        saveLocalTasks(filteredTasks)
        
        // Remove from deleted tasks localStorage
        removeDeletedTask(task.id)
        
        // Permanently delete from Convex if authenticated
        if (session?.user && task._id) {
          deleteTaskMutation({ taskId: task._id as any })
        }
      }, 60000)
      timeoutIds.push(timeoutId)
    }
    
    // Add to deleted queue for timeout management
    setDeletedTasksQueue(prev => [
      ...prev, 
      ...selectedTasks.map((task, index) => ({ task, timeoutId: timeoutIds[index] }))
    ])
    
    // Exit select mode
    setIsSelectMode(false)
    setSelectedTaskIds([])
    setShowDeleteConfirmation(false)
    
    // Show success toast with bulk restore action
    toast({
      title: "Tasks deleted",
      description: `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} deleted`,
      action: <ToastAction altText="Restore All" onClick={() => restoreBulkTasks(deletedTaskIds)}>Restore All</ToastAction>,
      duration: 60000
    })
  }

  const cancelSelectMode = () => {
    setIsSelectMode(false)
    setSelectedTaskIds([])
  }

  const handleBulkColorChange = async (newColor: string) => {
    if (selectedTaskIds.length === 0) return

    const updatedTasks = tasks.map((task) => 
      selectedTaskIds.includes(task.id) 
        ? { ...task, color: newColor }
        : task
    )
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks)
    
    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        for (const taskId of selectedTaskIds) {
          const task = tasks.find(t => t.id === taskId)
          if (task?._id) {
        await updateTaskMutation({
          taskId: task._id as any,
          color: newColor,
        })
          }
        }
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync bulk color change:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync color changes. Changes saved locally.",
          variant: "destructive",
        })
      }
    }

    // Show success toast
    toast({
      title: "Color updated",
      description: `${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''} updated`,
      duration: 3000
    })
  }

  const sections = Array.from({ length: 30 }, (_, i) => getDayInfo(i))

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error("App error:", error);
        setSyncStatus("error");
      }}
    >
      <main className="min-h-screen bg-background p-8 pb-24" style={{ paddingBottom: '700px' }}>
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 font-mono text-2xl font-semibold hover:opacity-80 transition-opacity"
            >
              <span>Add task</span>
              {isFormOpen ? (
                <ChevronDown className="h-6 w-6 transition-transform duration-200" />
              ) : (
                <Plus className="h-6 w-6 transition-transform duration-200" />
              )}
            </button>
            <div 
              className={`transition-transform duration-300 ease-in-out ${
                isFocusMode ? '-translate-y-[200%]' : 'translate-y-0'
              }`}
            >
              <div className="flex items-center gap-2">
                {session?.user ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{session.user.email}</span>
                    <button
                      onClick={() => authClient.signOut()}
                      className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <SignInDialog>
                    <button className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm">
                      Sign in
                    </button>
                  </SignInDialog>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>

        <AnimatePresence>
          {isFormOpen && <TaskForm onSubmit={addTask} />}
        </AnimatePresence>

        {sections.map((dayInfo) => {
          let sectionTasks = tasks.filter((t) => t.section === dayInfo.key)
          
          // Sort tasks: active first, then completed
          sectionTasks = sectionTasks.sort((a, b) => {
            if (a.completed === b.completed) return 0
            return a.completed ? 1 : -1
          })
          
          // Filter out completed tasks if showCompleted is false
          if (!showCompleted) {
            sectionTasks = sectionTasks.filter((t) => !t.completed)
          }
          
          const hasTasksOrIsTarget = sectionTasks.length > 0
          const shouldShow = dayInfo.daysFromNow === 0 || hasTasksOrIsTarget || isDragging

          return (
            <TaskSection
              key={dayInfo.key}
              title={dayInfo.title}
              tasks={sectionTasks}
              section={dayInfo.key}
              onReorder={updateTaskOrder}
              onDragStart={(taskSection) => {
                setIsDragging(true)
                setDraggingTaskSection(taskSection)
                setHoveredSection(null)
              }}
              onDragEnd={() => {
                setIsDragging(false)
                setDraggingTaskSection(null)
                setHoveredSection(null)
              }}
              onMoveToSection={moveTaskToSection}
              onToggleCompletion={toggleTaskCompletion}
              onUpdateTask={updateTask}
              onDelete={deleteTask}
              shouldShow={shouldShow}
              isDragging={isDragging}
              isCurrentSection={draggingTaskSection === dayInfo.key}
              draggingTaskSection={draggingTaskSection}
              hoveredSection={hoveredSection}
              onSectionHover={setHoveredSection}
              isSelectMode={isSelectMode}
              selectedTaskIds={selectedTaskIds}
              onSelect={handleTaskSelect}
            />
          )
        })}
      </div>

      {/* Sticky Bottom UI */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40 transition-transform duration-300 ease-in-out ${
          isFocusMode || isDragging ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Multi-purpose delete button */}
              {isSelectMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedTaskIds.length === 0}
                    className={`rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedTaskIds.length === 0 
                        ? "bg-background text-muted-foreground" 
                        : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedTaskIds.length})
                  </button>
                  <ColorPicker
                    currentColor="#ffb3ba"
                    onColorChange={handleBulkColorChange}
                    side="top"
                    trigger={
                      <button className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm bg-background">
                        Change color
                      </button>
                    }
                  />
                  <button
                    onClick={cancelSelectMode}
                    className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm bg-background"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleSelectMode}
                  className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm"
                >
                  <Square className="h-4 w-4" />
                  Select
                </button>
              )}
            </div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2"
              aria-label="Toggle completed tasks visibility"
            >
              {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="font-mono text-sm">{showCompleted ? "Hide" : "Show"} completed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmBulkDelete}
        selectedTasks={tasks.filter(task => selectedTaskIds.includes(task.id))}
      />

      {/* Toast Container */}
      <Toaster />
    </main>
    </ErrorBoundary>
  )
}
