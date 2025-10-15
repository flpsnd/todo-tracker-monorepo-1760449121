"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { useQuery, useMutation } from "convex/react"
// import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { loadLocalTasks, saveLocalTasks, getDeletedTasks, addDeletedTask, removeDeletedTask } from "@/lib/local-storage"
import { TaskForm } from "@/components/task-form"
import { TaskSection } from "@/components/task-section"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { DeleteZone } from "@/components/delete-zone"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Trash2, X, RefreshCw } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
// import { useConvexQueryWithErrorHandling, useConvexMutationWithErrorHandling } from "@/lib/use-convex-query"

// Temporary API object until Convex generates types
const api = {
  tasks: {
    getTasks: "tasks:getTasks" as any,
    addTask: "tasks:addTask" as any,
    updateTask: "tasks:updateTask" as any,
    deleteTask: "tasks:deleteTask" as any,
    syncLocalTasks: "tasks:syncLocalTasks" as any,
  }
}

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

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggingTaskSection, setDraggingTaskSection] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [syncStatus, setSyncStatus] = useState<"local-only" | "syncing" | "synced" | "error">("local-only")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [deletedTasksQueue, setDeletedTasksQueue] = useState<Array<{task: Task, timeoutId: NodeJS.Timeout}>>([])
  
  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // Auth state
  const { data: session } = authClient.useSession()
  
  // Convex queries and mutations
  const convexTasks = useQuery(api.tasks.getTasks)
  const addTaskMutation = useMutation(api.tasks.addTask)
  const updateTaskMutation = useMutation(api.tasks.updateTask)
  const deleteTaskMutation = useMutation(api.tasks.deleteTask)
  const syncLocalTasksMutation = useMutation(api.tasks.syncLocalTasks)
  
  // Toast hook
  const { toast } = useToast()

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return

    // Load tasks from localStorage immediately
    const localTasks = loadLocalTasks()
    setTasks(localTasks)
    setHasInitialized(true)

    // If user is authenticated, sync with Convex
    if (session?.user && convexTasks && Array.isArray(convexTasks)) {
      handleSyncWithConvex()
    }
  }, [session, convexTasks, hasInitialized])

  // Handle sync with Convex when user signs in
  const handleSyncWithConvex = async () => {
    if (!session?.user || !convexTasks || !Array.isArray(convexTasks)) return

    setSyncStatus("syncing")
    try {
      // If we have local tasks and no Convex tasks, upload local tasks
      if (tasks.length > 0 && convexTasks.length === 0) {
        await syncLocalTasksMutation({
          tasks: tasks.map((task: Task) => ({
            title: task.title,
            description: task.description,
            color: task.color,
            section: task.section,
            completed: task.completed,
          }))
        })
      }
      
      // Update local state with Convex tasks
      if (convexTasks.length > 0) {
        const convexTasksFormatted = convexTasks.map((task: any) => ({
          id: task._id, // Use Convex ID as the main ID
          _id: task._id, // Also store as _id for Convex operations
          title: task.title,
          description: task.description,
          color: task.color,
          section: task.section,
          completed: task.completed,
        }))
        setTasks(convexTasksFormatted)
        saveLocalTasks(convexTasksFormatted)
      }
      
      setSyncStatus("synced")
    } catch (error) {
      console.error("Sync error:", error)
      setSyncStatus("error")
      // Show error toast
      toast({
        title: "Sync Error",
        description: "Failed to sync with server. Working in offline mode.",
        variant: "destructive",
      })
    }
  }

  const addTask = async (task: Omit<Task, "id" | "section" | "completed">) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      section: "day-0",
      completed: false,
    }
    
    // Update local state immediately
    const updatedTasks = [...tasks, newTask]
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks)
    
    // If authenticated, also save to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        await addTaskMutation({
          title: newTask.title,
          description: newTask.description,
          color: newTask.color,
          section: newTask.section,
          completed: newTask.completed,
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task. It's saved locally.",
          variant: "destructive",
        })
      }
    }
  }

  const updateTaskOrder = async (section: string, newOrder: Task[]) => {
    const updatedTasks = (prevTasks: Task[]) => {
      const otherSectionTasks = prevTasks.filter((t) => t.section !== section)
      const updatedTasks = newOrder.map((task) => ({ ...task, section }))
      return [...otherSectionTasks, ...updatedTasks]
    }
    
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks(tasks))
    
    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        // Only sync tasks that have Convex IDs (not local UUIDs)
        for (const task of newOrder) {
          // Check if this is a Convex task (has _id field) or local task (has id field)
          if (task._id) {
            await updateTaskMutation({
              taskId: task._id,
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
  }

  const moveTaskToSection = async (taskId: string, targetSection: string) => {
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, section: targetSection } : task))
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks)
    
    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        const task = tasks.find(t => t.id === taskId)
        // Only sync if this is a Convex task (has _id field)
        if (task?._id) {
          await updateTaskMutation({
            taskId: task._id,
            section: targetSection,
          })
        }
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
  }

  const toggleTaskCompletion = async (taskId: string) => {
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks)
    
    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        const task = tasks.find(t => t.id === taskId)
        // Only sync if this is a Convex task (has _id field)
        if (task?._id) {
          await updateTaskMutation({
            taskId: task._id,
            completed: !task.completed,
          })
        }
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
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    setTasks(updatedTasks)
    saveLocalTasks(updatedTasks)
    
    // If authenticated, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        const task = tasks.find(t => t.id === taskId)
        // Only sync if this is a Convex task (has _id field)
        if (task?._id) {
          await updateTaskMutation({
            taskId: task._id,
            ...updates,
          })
        }
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to sync task update:", error)
        setSyncStatus("error")
        toast({
          title: "Sync Error",
          description: "Failed to sync task update. Changes saved locally.",
          variant: "destructive",
        })
      }
    }
  }

  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId)
    if (!taskToDelete) return
    
    // Remove from visible tasks immediately
    const updatedTasks = tasks.filter(t => t.id !== taskId)
    setTasks(updatedTasks)
    
    // Remove from localStorage immediately to persist deletion
    const currentTasks = loadLocalTasks()
    const filteredTasks = currentTasks.filter(t => t.id !== taskId)
    saveLocalTasks(filteredTasks)
    
    // Add to localStorage deleted tasks for restore functionality
    addDeletedTask(taskToDelete)
    
    // Set 60s timeout for permanent deletion from deleted tasks and Convex
    const timeoutId = setTimeout(() => {
      // Remove from deleted tasks localStorage
      removeDeletedTask(taskId)
      
      // Permanently delete from Convex if authenticated
      if (session?.user && taskToDelete._id) {
        deleteTaskMutation({ taskId: taskToDelete._id })
      }
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
  }

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
          deleteTaskMutation({ taskId: task._id })
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
              <span>Add new task</span>
              <ChevronDown className={`h-6 w-6 transition-transform duration-200 ${isFormOpen ? "rotate-180" : ""}`} />
            </button>
            <div className="flex items-center gap-2">
              {/* Sync Status Indicator */}
              <div className={`w-2 h-2 rounded-full ${
                syncStatus === "synced" ? "bg-green-500" :
                syncStatus === "syncing" ? "bg-yellow-500" :
                syncStatus === "error" ? "bg-red-500" :
                "bg-gray-400"
              }`} title={`Sync status: ${syncStatus}`} />
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
          const shouldShow = dayInfo.daysFromNow === 0 || hasTasksOrIsTarget

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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Multi-purpose delete button */}
              {isSelectMode ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={selectedTaskIds.length === 0}
                    className="font-mono"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedTaskIds.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelSelectMode}
                    className="font-mono"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant={isDragging ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleSelectMode}
                  data-delete-button
                  className={`font-mono transition-colors ${
                    isDragging 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : ""
                  }`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDragging ? "Drop here to delete" : "Select to delete"}
                </Button>
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
