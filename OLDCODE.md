## OLD CODE where convex pathing worked and the FE would connect to convex backend without issues:

All pages/components and code files are from the Todo app:

1. page.tsx:
"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import { ChevronDown, Eye, EyeOff, Plus, Trash2, X, Square } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useSession, signOut } from "@/lib/auth-client"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useTasks } from "@/lib/convex-query-adapter"
import { TasksSkeleton } from "@/components/tasks-skeleton"
import {
  loadLocalTasks,
  saveLocalTasks,
  getDeletedTasks,
  addDeletedTask,
  removeDeletedTask,
  clearLocalTasks,
  ensureLocalTask,
} from "@/lib/local-storage";
import { TaskForm } from "@/components/task-form"
import { TaskSection } from "@/components/task-section"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/color-picker"
import { ErrorBoundary } from "@/components/error-boundary"

export interface Task {
  id: string;
  clientId: string;
  _id?: Id<"tasks">; // Convex ID (only present for synced tasks)
  title: string;
  description: string;
  color: string;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  createdAt: number;
  updatedAt: number;
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

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}

function getDateInfo(dateString: string) {
  const date = new Date(dateString + 'T00:00:00'); // Ensure local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
  
  let title: string
  if (diffDays === 0) {
    title = "Tasks for today"
  } else if (diffDays === 1) {
    title = "Tasks for tomorrow"
  } else if (diffDays === -1) {
    title = "Tasks for yesterday"
  } else if (diffDays > 0 && diffDays <= 6) {
    title = `Tasks for ${dayName}`
  } else {
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "long" })
    const ordinalSuffix = getOrdinalSuffix(day)
    title = `Tasks for ${dayName}, ${day}${ordinalSuffix} ${month}`
  }
  
  return {
    key: dateString,
    title,
    date,
    diffDays,
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
    key: formatDate(date),
    title,
    date,
    daysFromNow,
  }
}

function fromConvexTask(task: Doc<"tasks">): Task {
  // Handle migration from section to dueDate
  let dueDate = task.dueDate;
  if (!dueDate && (task as any).section && (task as any).section.startsWith('day-')) {
    const daysFromNow = parseInt((task as any).section.replace('day-', ''));
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

function replaceTaskIds(tasks: Task[], replacements: Record<string, Id<"tasks">>): Task[] {
  return tasks.map(task => {
    if (replacements[task.id]) {
      return {
        ...task,
        id: replacements[task.id],
        _id: replacements[task.id],
      }
    }
    return task
  })
}

function createLocalTask(partial: {
  id?: string;
  clientId?: string;
  title: string;
  description: string;
  color: string;
}): Task {
  const now = Date.now();
  return {
    id: partial.id ?? crypto.randomUUID(),
    clientId: partial.clientId ?? crypto.randomUUID(),
    title: partial.title,
    description: partial.description,
    color: partial.color,
    dueDate: formatDate(new Date()), // Default to today
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createOnboardingTasks(): Task[] {
  const today = formatDate(new Date());
  return [
    createLocalTask({
      title: "Create new tasks",
      description: "Click 'Add task' above to create your first task. You can add a title, description, and choose a color.",
      color: "#baffc9", // Green
    }),
    createLocalTask({
      title: "Drag to reorder",
      description: "Click and drag tasks to reorder them within the same day, or drag them to different days to reschedule.",
      color: "#bae1ff", // Blue
    }),
    createLocalTask({
      title: "Click to edit",
      description: "Click on a task's title or description to edit it. You can also change the color by clicking the colored circle.",
      color: "#ffffba", // Yellow
    }),
  ];
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
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [pendingMigrationCount, setPendingMigrationCount] = useState(0)
  const [deletedTasksQueue, setDeletedTasksQueue] = useState<Array<{ task: Task; timeoutId: NodeJS.Timeout }>>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onboardingTasksCreated, setOnboardingTasksCreated] = useState(false);

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
  const { data: session, isPending } = useSession()
  const hasSession = Boolean(session?.user)
  const isAuthenticated = hasSession
  const isLoading = isPending
  
  // Auth state is managed by Better Auth hooks

  // Use the new adapter hook that combines Convex realtime with TanStack Query caching
  const { tasks: tasksFromAdapter, isLoading: isLoadingTasks, isRealtime } = useTasks()

  // Convex mutations
  const addTaskMutation = useMutation(api.tasks.addTask).withOptimisticUpdate(
    (local, args) => {
      const tasks = local.getQuery(api.tasks.getTasks, {});
      if (tasks === undefined) return; // Query not loaded yet
      
      const optimisticTask = {
        _id: crypto.randomUUID() as any,
        _creationTime: Date.now(),
        clientId: args.clientId,
        title: args.title,
        description: args.description,
        color: args.color,
        dueDate: args.dueDate,
        completed: args.completed,
        createdAt: args.createdAt ?? Date.now(),
        updatedAt: args.updatedAt ?? Date.now(),
        userEmail: "", // Will be set by server
        isDeleted: false,
      };
      
      local.setQuery(api.tasks.getTasks, {}, [...tasks, optimisticTask]);
    }
  );
  const updateTaskMutation = useMutation(api.tasks.updateTask).withOptimisticUpdate(
    (local, args) => {
      const tasks = local.getQuery(api.tasks.getTasks, {});
      if (tasks === undefined) return;
      
      const next = tasks.map((task: Doc<"tasks">) => 
        task._id === args.taskId 
          ? { ...task, ...args, updatedAt: Date.now() }
          : task
      );
      
      local.setQuery(api.tasks.getTasks, {}, next);
    }
  );
  const deleteTaskMutation = useMutation(api.tasks.deleteTask).withOptimisticUpdate(
    (local, args) => {
      const tasks = local.getQuery(api.tasks.getTasks, {});
      if (tasks === undefined) return;
      
      const next = tasks.filter((task: Doc<"tasks">) => task._id !== args.taskId);
      local.setQuery(api.tasks.getTasks, {}, next);
    }
  );
  const restoreTaskMutation = useMutation(api.tasks.restoreTask);
  const permanentlyDeleteTaskMutation = useMutation(api.tasks.permanentlyDeleteTask)
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

  // Track previous tasks serialization to detect actual changes
  const prevTasksSerializedRef = useRef<string | null>(null);

  // Sync tasks from adapter to local state
  // The adapter provides cached data immediately, then live data when available
  useEffect(() => {
    if (!hasInitialized || isMigrating || isDeleting) return;

    // If authenticated and we have realtime data, use it
    if (isAuthenticated && isRealtime && tasksFromAdapter.length === 0 && !onboardingTasksCreated) {
      // Create onboarding tasks for new users
      const onboardingTasks = createOnboardingTasks();
      setTasks(onboardingTasks);
      setOnboardingTasksCreated(true);
      // Save onboarding tasks to Convex
      Promise.all(
        onboardingTasks.map(async (task) => {
          try {
            await addTaskMutation({
              clientId: task.clientId,
              title: task.title,
              description: task.description,
              color: task.color,
              dueDate: task.dueDate,
              completed: task.completed,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
            });
          } catch (error) {
            console.error("Failed to add onboarding task:", error);
          }
        })
      ).catch((error) => {
        console.error("Failed to create onboarding tasks:", error);
      });
      return;
    }

    // Update tasks when adapter data changes (handles both cached and live data)
    if (tasksFromAdapter.length > 0 || (isAuthenticated && isRealtime)) {
      // Create a comprehensive serialization to compare all task data
      const sortedTasks = [...tasksFromAdapter].sort((a, b) => a.id.localeCompare(b.id));
      const currentSerialized = JSON.stringify(
        sortedTasks.map(t => ({
          id: t.id,
          _id: t._id,
          clientId: t.clientId,
          title: t.title,
          description: t.description,
          color: t.color,
          dueDate: t.dueDate,
          completed: t.completed,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }))
      );
        
      // Only update if the data has actually changed
      if (prevTasksSerializedRef.current !== currentSerialized) {
        prevTasksSerializedRef.current = currentSerialized;
        setTasks(tasksFromAdapter);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksFromAdapter, isAuthenticated, isRealtime, isMigrating, hasInitialized, isDeleting, onboardingTasksCreated]);

  // Initialize app with local-first logic
  useEffect(() => {
    if (hasInitialized) return
    
    // Only initialize after auth state is determined
    if (isLoading) return // Wait for auth to load
    
    // Only load local tasks if not authenticated (to avoid overriding Convex data)
    if (!isAuthenticated) {
      const localTasks = loadLocalTasks().map(ensureLocalTask)
      // If no tasks, show onboarding tasks
      if (localTasks.length === 0) {
        const onboardingTasks = createOnboardingTasks()
        setTasks(onboardingTasks)
        saveLocalTasks(onboardingTasks)
      } else {
        setTasks(localTasks)
      }
    }
    // If authenticated, tasks will come from the adapter (cached or live)
    setHasInitialized(true)
  }, [hasInitialized, isAuthenticated, isLoading])

  // Migration effect - runs once when user first authenticates
  useEffect(() => {
    if (!hasSession || isLoading || !hasInitialized) return

    const userId = session?.user?.id ?? session?.user?.email
    if (!userId) return

    const migrationFlagKey = `todo:migrated:${userId}`
    const migrationFlag = typeof window !== "undefined" ? localStorage.getItem(migrationFlagKey) : null
    if (migrationFlag === "true") return

    const localTasks = loadLocalTasks()
    if (localTasks.length === 0) {
      localStorage.setItem(migrationFlagKey, "true")
      return
    }

    setIsMigrating(true)
    setPendingMigrationCount(localTasks.length)
    setMigrationError(null)

    syncLocalTasksMutation({
      tasks: localTasks.map((task) => {
        // Convert old section format (day-0, day-1, etc.) to proper dates
        let dueDate: string;
        if ((task as any).section && (task as any).section.startsWith('day-')) {
          const daysFromNow = parseInt((task as any).section.replace('day-', ''));
          const date = new Date();
          date.setDate(date.getDate() + daysFromNow);
          dueDate = formatDate(date);
        } else {
          // If it's already a date string, use it; otherwise default to today
          dueDate = task.dueDate || formatDate(new Date());
        }
        
        return {
          clientId: task.clientId,
          title: task.title,
          description: task.description,
          color: task.color,
          dueDate: dueDate,
          completed: task.completed,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      }),
    })
      .then((result) => {
        clearLocalTasks()
        localStorage.setItem(migrationFlagKey, "true")
        setIsMigrating(false)
        setPendingMigrationCount(0)
        setSyncStatus("synced")
      })
      .catch((error) => {
        console.error("Migration failed", error)
        setMigrationError("Cloud sync failed. Working locally.")
        setIsMigrating(false)
        setSyncStatus("error")
        toast({
          title: "Migration Error",
          description: "Failed to migrate tasks. You can retry from settings.",
          variant: "destructive",
        })
      })
  }, [hasSession, isLoading, hasInitialized, syncLocalTasksMutation, session, toast])

  // Overdue task migration - runs when date changes (midnight detection)
  useEffect(() => {
    if (!hasInitialized) return;
    
    const checkAndMigrateOverdueTasks = async () => {
      const today = formatDate(new Date());
      const lastChecked = localStorage.getItem('lastTaskDateCheck');
      
      // Only run if date changed
      if (lastChecked === today) return;
      
      // Find overdue uncompleted tasks
      const overdueTasks = tasks.filter(t => 
        !t.completed && t.dueDate < today
      );
      
      if (overdueTasks.length > 0) {
        const isAuthenticated = !!session?.user;
        
        // Update tasks to today's date
        const updatedTasks = tasks.map(task => {
          if (overdueTasks.some(ot => ot.id === task.id)) {
            return { ...task, dueDate: today, updatedAt: Date.now() };
          }
          return task;
        });
        
        setTasks(updatedTasks);
        
        // Sync to Convex if authenticated
        if (isAuthenticated) {
          try {
            setSyncStatus("syncing");
            for (const task of overdueTasks) {
              if (task._id) {
                await updateTaskMutation({
                  taskId: task._id,
                  dueDate: today,
                });
              }
            }
            setSyncStatus("synced");
          } catch (error) {
            console.error("Failed to sync overdue task migration:", error);
            setSyncStatus("error");
            toast({
              title: "Sync Error",
              description: "Failed to sync overdue tasks to cloud.",
              variant: "destructive",
            });
          }
        } else {
          // Save to localStorage if not authenticated
          saveLocalTasks(updatedTasks);
        }
        
        // Show notification
        toast({
          title: "Overdue tasks moved",
          description: `${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} moved to today`,
          duration: 5000
        });
      }
      
      // Update last checked date
      localStorage.setItem('lastTaskDateCheck', today);
    };
    
    checkAndMigrateOverdueTasks();
    
    // Check on window focus (when user returns to app after midnight)
    const handleFocus = () => {
      checkAndMigrateOverdueTasks();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [hasInitialized, tasks, isAuthenticated, updateTaskMutation, toast, session?.user]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "clientId" | "dueDate" | "completed" | "createdAt" | "updatedAt" | "_id">) => {
      const localTask = createLocalTask(task);

      if (hasSession) {
        try {
          // Optimistic update happens automatically via withOptimisticUpdate
          await addTaskMutation({
            clientId: localTask.clientId,
            title: localTask.title,
            description: localTask.description,
            color: localTask.color,
            dueDate: localTask.dueDate,
            completed: localTask.completed,
            createdAt: localTask.createdAt,
            updatedAt: localTask.updatedAt,
          });
          // No need to manually update state - query will update via real-time subscription
        } catch (error) {
          console.error("Failed to add task to Convex:", error);
          toast({
            title: "Cloud sync failed",
            description: "Failed to add task.",
            variant: "destructive",
          });
          // Fallback: add to local state on error
          setTasks((prev) => {
            const next = [...prev, localTask];
            saveLocalTasks(next);
            return next;
          });
        }
      } else {
        // Unauthenticated: use local state
        setTasks((prev) => {
          const next = [...prev, localTask];
          saveLocalTasks(next);
          return next;
        });
      }
    },
    [hasSession, addTaskMutation, toast]
  );

  const updateTaskOrder = useCallback(
    async (dueDate: string, newOrder: Task[]) => {
      const isAuthenticated = !!session?.user;

      const prevDateTasks = tasks.filter((t) => t.dueDate === dueDate);
      const newOrderIds = newOrder.map((task) => task.id);
      const prevIds = prevDateTasks.map((task) => task.id);

      const sameMembership =
        newOrderIds.length === prevIds.length &&
        newOrderIds.every((id) => prevIds.includes(id));

      if (!sameMembership) {
        return;
      }

      setTasks((prev) => {
        const otherDateTasks = prev.filter((t) => t.dueDate !== dueDate);

        const reordered = newOrderIds
          .map((id) => prev.find((task) => task.id === id))
          .filter((task): task is Task => Boolean(task));

        const next = [...otherDateTasks, ...reordered];

        if (!isAuthenticated) {
          saveLocalTasks(next);
        }

        return next;
      });

      if (isAuthenticated) {
        try {
          // Optimistic updates happen automatically via withOptimisticUpdate
          for (const task of newOrder) {
            if (task._id) {
              await updateTaskMutation({
                taskId: task._id,
                dueDate,
              });
            }
          }
        } catch (error) {
          console.error("Failed to sync task order:", error);
          toast({
            title: "Sync Error",
            description: "Failed to sync task order.",
            variant: "destructive",
          });
        }
      }
    },
    [session?.user, updateTaskMutation, toast, tasks]
  );

  const moveTaskToSection = useCallback(async (taskId: string, targetDueDate: string) => {
    const isAuthenticated = !!session?.user;
    
    // Find the task before updating state to avoid async issues
    const taskToMove = tasks.find(task => task.id === taskId);
    if (!taskToMove) {
      return;
    }
    
    if (isAuthenticated && taskToMove._id) {
      try {
        // Optimistic update happens automatically via withOptimisticUpdate
          await updateTaskMutation({
          taskId: taskToMove._id,
            dueDate: targetDueDate,
          })
        } catch (error) {
          console.error("Failed to sync task move:", error)
          toast({
            title: "Sync Error",
          description: "Failed to sync task move.",
            variant: "destructive",
          })
        }
    } else if (isAuthenticated && !taskToMove._id) {
      // Task doesn't have _id yet, need to create it
      try {
        await addTaskMutation({
          clientId: taskToMove.clientId,
          title: taskToMove.title,
          description: taskToMove.description,
          color: taskToMove.color,
          dueDate: targetDueDate,
          completed: taskToMove.completed,
          createdAt: taskToMove.createdAt,
            updatedAt: Date.now(),
          })
        } catch (error) {
          console.error("Failed to sync new task move:", error)
          toast({
            title: "Sync Error",
          description: "Failed to sync task move.",
            variant: "destructive",
          })
        }
    } else {
      // Unauthenticated: use local state
      const movedTask: Task = { ...taskToMove, dueDate: targetDueDate };
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id === taskId) {
            return movedTask
          }
          return task
        })
        saveLocalTasks(next)
        return next
      })
    }
  }, [session?.user, updateTaskMutation, toast, addTaskMutation, tasks])

  const toggleTaskCompletion = useCallback(async (taskId: string) => {
    const isAuthenticated = !!session?.user;
    
    // Find the task before updating state to avoid async issues
    const taskToToggle = tasks.find(task => task.id === taskId);
    if (!taskToToggle) {
      return;
    }
    
    if (isAuthenticated && taskToToggle._id) {
      try {
        // Optimistic update happens automatically via withOptimisticUpdate
          await updateTaskMutation({
          taskId: taskToToggle._id,
          completed: !taskToToggle.completed,
          })
        } catch (error) {
          console.error("Failed to sync task completion:", error)
          toast({
            title: "Sync Error",
          description: "Failed to sync task completion.",
            variant: "destructive",
          })
        }
    } else if (isAuthenticated && !taskToToggle._id) {
      // Task doesn't have _id yet, need to create it
      try {
        await addTaskMutation({
          clientId: taskToToggle.clientId,
          title: taskToToggle.title,
          description: taskToToggle.description,
          color: taskToToggle.color,
          dueDate: taskToToggle.dueDate,
          completed: !taskToToggle.completed,
          createdAt: taskToToggle.createdAt,
          updatedAt: taskToToggle.updatedAt,
          })
        } catch (error) {
          console.error("Failed to sync local task completion:", error)
          toast({
            title: "Sync Error",
          description: "Failed to sync task completion.",
            variant: "destructive",
          })
        }
    } else {
      // Unauthenticated: use local state
      const toggledTask: Task = { ...taskToToggle, completed: !taskToToggle.completed };
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id === taskId) {
            return toggledTask
          }
          return task
        })
        saveLocalTasks(next)
        return next
      })
    }
  }, [session?.user, updateTaskMutation, toast, addTaskMutation, tasks])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const isAuthenticated = !!session?.user;
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (isAuthenticated && task._id) {
      try {
        // Optimistic update happens automatically via withOptimisticUpdate
        await updateTaskMutation({
          taskId: task._id,
          ...updates,
        })
      } catch (error) {
        console.error("Failed to sync task update:", error)
        toast({
          title: "Sync Error",
          description: "Failed to sync task update.",
          variant: "destructive",
        })
      }
    } else if (isAuthenticated && !task._id) {
      // Task doesn't have _id yet, need to create it
      const updatedTask: Task = {
        ...task,
        ...updates,
        updatedAt: Date.now(),
      }
      try {
        await addTaskMutation({
          clientId: updatedTask.clientId,
          title: updatedTask.title,
          description: updatedTask.description,
          color: updatedTask.color,
          dueDate: updatedTask.dueDate,
          completed: updatedTask.completed,
          createdAt: updatedTask.createdAt,
          updatedAt: updatedTask.updatedAt,
        })
      } catch (error) {
        console.error("Failed to sync local task update:", error)
        toast({
          title: "Sync Error",
          description: "Failed to sync task update.",
          variant: "destructive",
        })
      }
    } else {
      // Unauthenticated: use local state
      const updatedTask: Task = {
        ...task,
        ...updates,
        updatedAt: Date.now(),
      }
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === taskId ? updatedTask : t))
        saveLocalTasks(next)
        return next
      })
    }
  }, [tasks, isAuthenticated, updateTaskMutation, toast, addTaskMutation])

  const deleteTask = useCallback(async (taskId: string) => {
    const isAuthenticated = !!session?.user;
    const taskToDelete = tasks.find(t => t.id === taskId)
    if (!taskToDelete) return
    
    if (isAuthenticated && taskToDelete._id) {
      try {
        setIsDeleting(true)
        // Optimistic update happens automatically via withOptimisticUpdate
        await deleteTaskMutation({ taskId: taskToDelete._id })
        
        // Add to deleted queue for timeout management
        const timeoutId = setTimeout(() => {
          // Permanently delete after 60 seconds
          permanentlyDeleteTaskMutation({ taskId: taskToDelete._id! })
        }, 60000)
        
        const queueItem = { task: taskToDelete, timeoutId }
        setDeletedTasksQueue(prev => [...prev, queueItem])
        
        // Also store in localStorage for persistence across re-renders
        const existingQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
        existingQueue.push({
          task: taskToDelete,
          deletedAt: Date.now()
        })
        localStorage.setItem('deletedTasksQueue', JSON.stringify(existingQueue))
        
        setIsDeleting(false)
        
        // Show toast with restore action
        toast({
          title: "Task deleted",
          description: taskToDelete.title,
          action: <ToastAction altText="Restore" onClick={() => restoreTask(taskId)}>Restore</ToastAction>,
          duration: 60000
        })
      } catch (error) {
        console.error("Failed to delete task from Convex:", error)
        setIsDeleting(false)
        toast({
          title: "Delete Error",
          description: "Failed to delete task from cloud.",
          variant: "destructive",
        })
      }
    } else {
      // Unauthenticated: use local state
      setIsDeleting(true)
      setTasks((prev) => prev.filter(t => t.id !== taskId))
      
      const currentTasks = loadLocalTasks()
      const filteredTasks = currentTasks.filter(t => t.id !== taskId)
      saveLocalTasks(filteredTasks)
      addDeletedTask(taskToDelete)
      setIsDeleting(false)
      
      // Show toast with restore action for localStorage mode
      toast({
        title: "Task deleted",
        description: taskToDelete.title,
        action: <ToastAction altText="Restore" onClick={() => restoreTask(taskId)}>Restore</ToastAction>,
        duration: 60000
      })
    }
  }, [isAuthenticated, deleteTaskMutation, permanentlyDeleteTaskMutation, tasks, toast, session?.user])

  const restoreTask = async (taskId: string) => {
    const isAuthenticated = !!session?.user;
    
    // Clear timeout from React state
    let queueItem = deletedTasksQueue.find(item => item.task.id === taskId)
    
    // If not found in React state, check localStorage as fallback
    if (!queueItem) {
      const localStorageQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
      const localStorageItem = localStorageQueue.find((item: any) => item.task.id === taskId)
      
      if (localStorageItem) {
        // Check if it's within 60 seconds
        const now = Date.now()
        if (now - localStorageItem.deletedAt < 60000) {
          queueItem = { task: localStorageItem.task, timeoutId: null as any }
        } else {
          // Remove expired task from localStorage
          const filteredQueue = localStorageQueue.filter((item: any) => item.task.id !== taskId)
          localStorage.setItem('deletedTasksQueue', JSON.stringify(filteredQueue))
          return
        }
      }
    }
    
    if (queueItem) {
      if (queueItem.timeoutId) {
        clearTimeout(queueItem.timeoutId)
      }
      setDeletedTasksQueue(prev => prev.filter(item => item.task.id !== taskId))
      
      // Remove from localStorage as well
      const localStorageQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
      const filteredQueue = localStorageQueue.filter((item: any) => item.task.id !== taskId)
      localStorage.setItem('deletedTasksQueue', JSON.stringify(filteredQueue))
    }
    
    if (isAuthenticated) {
      // Convex mode - restore from soft deleted state
      const taskToRestore = queueItem?.task;
      
      if (!taskToRestore || !taskToRestore._id) {
        return
      }
      
      // Optimistically add the task back to local state immediately
      setTasks((prev) => {
        // Check if task already exists (shouldn't, but safety check)
        if (prev.find(t => t.id === taskToRestore.id)) {
          return prev;
        }
        return [...prev, taskToRestore];
      });
      
      try {
        // Call mutation - when server responds, query will update and reconcile
        await restoreTaskMutation({ taskId: taskToRestore._id })
        
        // Show success toast
        toast({
          title: "Task restored",
          description: taskToRestore.title,
          duration: 3000
        })
      } catch (error) {
        console.error("Failed to restore task:", error)
        // On error, remove the optimistically added task
        setTasks((prev) => prev.filter(t => t.id !== taskToRestore.id));
        toast({
          title: "Restore Error",
          description: "Failed to restore task from cloud.",
          variant: "destructive",
        })
      }
    } else {
      // localStorage mode - existing logic
      // Check if task is already in localStorage to prevent duplicates
      const currentLocalTasks = loadLocalTasks()
      const currentLocalTaskIds = new Set(currentLocalTasks.map(task => task.id))
      if (currentLocalTaskIds.has(taskId)) {
        return
      }
      
      // Get deleted tasks from localStorage
      const deletedTasks = getDeletedTasks()
      const deletedItem = deletedTasks.find(item => item.task.id === taskId)
      
      if (!deletedItem) {
        return
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
  }

  const restoreBulkTasks = async (taskIds: string[]) => {
    const isAuthenticated = !!session?.user;
    
    // Clear timeouts from React state for all tasks
    const tasksToRestore: Task[] = []
    for (const taskId of taskIds) {
      let queueItem = deletedTasksQueue.find(item => item.task.id === taskId)
      
      // If not found in React state, check localStorage as fallback
      if (!queueItem) {
        const localStorageQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
        const localStorageItem = localStorageQueue.find((item: any) => item.task.id === taskId)
        
        if (localStorageItem) {
          const now = Date.now()
          if (now - localStorageItem.deletedAt < 60000) {
            queueItem = { task: localStorageItem.task, timeoutId: null as any }
          }
        }
      }
      
      if (queueItem) {
        if (queueItem.timeoutId) {
          clearTimeout(queueItem.timeoutId)
        }
        setDeletedTasksQueue(prev => prev.filter(item => item.task.id !== taskId))
        
        // Remove from localStorage as well
        const localStorageQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
        const filteredQueue = localStorageQueue.filter((item: any) => item.task.id !== taskId)
        localStorage.setItem('deletedTasksQueue', JSON.stringify(filteredQueue))
        
        if (queueItem.task._id) {
          tasksToRestore.push(queueItem.task)
        }
      }
    }
    
    if (isAuthenticated) {
      if (tasksToRestore.length === 0) {
        return
      }
      
      // Optimistically add tasks back to local state immediately
      setTasks((prev) => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTasks = tasksToRestore.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTasks];
      });
      
      try {
        // Restore each task
        for (const task of tasksToRestore) {
          await restoreTaskMutation({ taskId: task._id! })
        }
        
        // Show success toast
        toast({
          title: "Tasks restored",
          description: `${tasksToRestore.length} task${tasksToRestore.length !== 1 ? 's' : ''} restored`,
          duration: 3000
        })
      } catch (error) {
        // On error, remove the optimistically added tasks
        setTasks((prev) => {
          const restoredIds = new Set(tasksToRestore.map(t => t.id));
          return prev.filter(t => !restoredIds.has(t.id));
        });
        toast({
          title: "Restore Error",
          description: "Failed to restore tasks from cloud.",
          variant: "destructive",
        })
      }
    } else {
      // localStorage mode - existing logic
      // Get deleted tasks from localStorage
      const deletedTasks = getDeletedTasks()
      const deletedItems = deletedTasks.filter(item => taskIds.includes(item.task.id))
      
      if (deletedItems.length === 0) {
        return
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
    
    setIsDeleting(true)
    // Remove all selected tasks from visible state immediately
    const updatedTasks = tasks.filter(task => !selectedTaskIds.includes(task.id))
    setTasks(updatedTasks)
    
    const isAuthenticated = !!session?.user;
    
    // Only save to localStorage if NOT authenticated
    if (!isAuthenticated) {
      // Remove from localStorage immediately to persist deletion
      const currentTasks = loadLocalTasks()
      const filteredTasks = currentTasks.filter(task => !selectedTaskIds.includes(task.id))
      saveLocalTasks(filteredTasks)
      
      // Add all tasks to deleted tasks localStorage
      for (const task of selectedTasks) {
        addDeletedTask(task)
      }
      setIsDeleting(false)
    }
    
    // Set timeouts for permanent deletion
    const timeoutIds: NodeJS.Timeout[] = []
    for (const task of selectedTasks) {
      const timeoutId = setTimeout(() => {
        // Only remove from localStorage if NOT authenticated
        if (!isAuthenticated) {
          const currentTasks = loadLocalTasks()
          const filteredTasks = currentTasks.filter(t => t.id !== task.id)
          saveLocalTasks(filteredTasks)
          
          // Remove from deleted tasks localStorage
          removeDeletedTask(task.id)
        }
        
        // Permanently delete from Convex if authenticated
        if (isAuthenticated && task._id) {
          permanentlyDeleteTaskMutation({ taskId: task._id })
        }
      }, 60000)
      timeoutIds.push(timeoutId)
    }
    
    // Add to deleted queue for timeout management
    const queueItems = selectedTasks.map((task, index) => ({ task, timeoutId: timeoutIds[index] }))
    setDeletedTasksQueue(prev => [...prev, ...queueItems])
    
    // Also store in localStorage for persistence across re-renders
    const existingQueue = JSON.parse(localStorage.getItem('deletedTasksQueue') || '[]')
    const now = Date.now()
    selectedTasks.forEach(task => {
      existingQueue.push({
        task: task,
        deletedAt: now
      })
    })
    localStorage.setItem('deletedTasksQueue', JSON.stringify(existingQueue))
    
    // If authenticated, soft delete all tasks
    if (isAuthenticated) {
      try {
        setSyncStatus("syncing")
        for (const task of selectedTasks) {
          if (task._id) {
            await deleteTaskMutation({ taskId: task._id })
          }
        }
        setSyncStatus("synced")
        setIsDeleting(false)
      } catch (error) {
        console.error("Failed to soft delete bulk tasks:", error)
        setSyncStatus("error")
        setIsDeleting(false)
        toast({
          title: "Delete Error",
          description: "Failed to delete tasks from cloud.",
          variant: "destructive",
        })
      }
    }
    
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
    const isAuthenticated = !!session?.user;
    if (selectedTaskIds.length === 0) return

    const updatedTasks = tasks.map((task) => 
      selectedTaskIds.includes(task.id) 
        ? { ...task, color: newColor }
        : task
    )
    setTasks(updatedTasks)
    
    // Only save to localStorage if NOT authenticated
    if (!isAuthenticated) {
      saveLocalTasks(updatedTasks)
    }
    
    // If authenticated, sync to Convex
    if (isAuthenticated) {
      try {
        setSyncStatus("syncing")
        for (const taskId of selectedTaskIds) {
          const task = tasks.find(t => t.id === taskId)
          if (task?._id) {
        await updateTaskMutation({
          taskId: task._id,
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

  const retryMigration = useCallback(() => {
    if (!session?.user) return
    const userId = session.user.id ?? session.user.email
    if (!userId) return
    localStorage.removeItem(`todo:migrated:${userId}`)
    setMigrationError(null)
    setIsMigrating(false)
  }, [session])

  const sections = Array.from({ length: 30 }, (_, i) => getDayInfo(i))

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error("App error:", error);
        setSyncStatus("error");
      }}
    >
      <main className="min-h-screen bg-background p-8 pb-24" style={{ paddingBottom: "700px" }}>
        <div className="mx-auto max-w-2xl space-y-3">
          {isMigrating && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm font-mono text-muted-foreground flex items-center justify-between">
              <span>Syncing {pendingMigrationCount} task{pendingMigrationCount === 1 ? "" : "s"} to cloud…</span>
              <span className="animate-pulse">Please keep the tab open</span>
            </div>
          )}
          {migrationError && (
            <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm font-mono text-red-600 flex items-center justify-between">
              <span>{migrationError}</span>
              <button
                onClick={retryMigration}
                className="underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 font-mono text-2xl font-semibold hover:opacity-80 transition-opacity"
              disabled={isMigrating}
            >
              <span>{isMigrating ? "Syncing tasks" : "Add task"}</span>
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
                    <button
                      onClick={() => signOut()}
                      className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm"
                      disabled={isMigrating}
                    >
                      Sign out
                    </button>
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

          <AnimatePresence>{isFormOpen && !isMigrating && <TaskForm onSubmit={addTask} />}</AnimatePresence>

          {/* Show skeleton while loading initial data (only on first load with no cache) */}
          {isLoadingTasks && tasks.length === 0 && isAuthenticated && (
            <TasksSkeleton />
          )}

          {sections.map((dayInfo) => {
            let sectionTasks = tasks.filter((t) => t.dueDate === dayInfo.key);
            sectionTasks = sectionTasks
              .slice()
              .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

            if (!showCompleted) {
              sectionTasks = sectionTasks.filter((t) => !t.completed);
            }

            const hasTasksOrIsTarget = sectionTasks.length > 0;
            const shouldShow = dayInfo.daysFromNow === 0 || hasTasksOrIsTarget || isDragging;

            return (
              <TaskSection
                key={dayInfo.key}
                title={dayInfo.title}
                tasks={sectionTasks}
                section={dayInfo.key}
                onReorder={isMigrating ? () => {} : updateTaskOrder}
                onDragStart={(taskSection) => {
                  if (!isMigrating) {
                    setIsDragging(true)
                    setDraggingTaskSection(taskSection)
                    setHoveredSection(null)
                  }
                }}
                onDragEnd={() => {
                  if (!isMigrating) {
                    setIsDragging(false)
                    setDraggingTaskSection(null)
                    setHoveredSection(null)
                  }
                }}
                onMoveToSection={isMigrating ? () => {} : moveTaskToSection}
                onToggleCompletion={isMigrating ? () => {} : toggleTaskCompletion}
                onUpdateTask={isMigrating ? () => {} : updateTask}
                onDelete={isMigrating ? () => {} : deleteTask}
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

        <div
          className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40 transition-transform duration-300 ease-in-out ${
            isFocusMode || isDragging ? "translate-y-full" : "translate-y-0"
          }`}
        >
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isSelectMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedTaskIds.length === 0 || isMigrating}
                      className={`rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedTaskIds.length === 0 || isMigrating
                          ? "bg-background text-muted-foreground"
                          : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedTaskIds.length})
                    </button>
                    <ColorPicker
                      currentColor="#ffb3ba"
                      onColorChange={isMigrating ? () => {} : handleBulkColorChange}
                      side="top"
                      trigger={
                        <button className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm bg-background">
                          Change color
                        </button>
                      }
                    />
                    <button
                      onClick={cancelSelectMode}
                      className="rounded-lg border border-border p-2 pr-2 md:pr-[0.75rem] hover:bg-accent transition-colors flex items-center justify-center md:justify-start gap-2 font-mono text-sm bg-background"
                      disabled={isMigrating}
                    >
                      <X className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={toggleSelectMode}
                    className="rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 font-mono text-sm"
                    disabled={isMigrating}
                  >
                    <Square className="h-4 w-4" />
                    Select
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`rounded-lg border border-border p-2 pr-[0.75rem] hover:bg-accent transition-colors flex items-center gap-2 ${
                  isSelectMode ? "hidden md:flex" : ""
                }`}
                aria-label="Toggle completed tasks visibility"
                disabled={isMigrating}
              >
                {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="font-mono text-sm">{showCompleted ? "Hide" : "Show"} completed</span>
              </button>
            </div>
          </div>
        </div>

        <DeleteConfirmationDialog
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={confirmBulkDelete}
          selectedTasks={tasks.filter((task) => selectedTaskIds.includes(task.id))}
        />

        <Toaster />
      </main>
    </ErrorBoundary>
  );
}

2. convex-query-adapter
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


3. local-storage:
import type { Task } from "@/app/page";
import type { Id } from "@/convex/_generated/dataModel";

const STORAGE_KEY = "todo-tasks-local";
const DELETED_TASKS_KEY = "todo-deleted-tasks";

export interface DeletedTask {
  task: Task;
  deletedAt: number;
  timeoutId?: number;
}

type PlainTask = Omit<Task, "_id"> & { _id?: string };

function rebuildTask(task: PlainTask): Task {
  return {
    ...task,
    id: task.id,
    clientId: task.clientId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    _id: task._id ? (task._id as Id<"tasks">) : undefined,
  };
}

export function ensureLocalTask(task: Task): Task {
  const now = Date.now();
  return {
    ...task,
    id: task.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    clientId:
      task.clientId ||
      (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
  };
}

export function loadLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed: PlainTask[] = data ? JSON.parse(data) : [];
    return parsed.map((task) => ensureLocalTask(rebuildTask(task)));
  } catch (error) {
    console.error("Failed to load local tasks:", error);
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = tasks.map(ensureLocalTask);
    const plain: PlainTask[] = sanitized.map((task) => ({
      ...task,
      _id: task._id,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
  } catch (error) {
    console.error("Failed to save local tasks:", error);
  }
}

export function clearLocalTasks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear local tasks:", error);
  }
}

export function replaceTaskIds(tasks: Task[], replacements: Record<string, string>): Task[] {
  const updated = tasks.map((task) => {
    const newId = replacements[task.id];
    if (!newId) return task;
    return {
      ...task,
      id: newId,
      _id: newId as Id<"tasks">,
    };
  });
  saveLocalTasks(updated);
  return updated;
}

export function getDeletedTasks(): DeletedTask[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(DELETED_TASKS_KEY);
    const deletedTasks = data ? JSON.parse(data) : [];
    
    // Clean up expired tasks (older than 60 seconds)
    const now = Date.now();
    const validTasks = deletedTasks.filter((deletedTask: DeletedTask) => {
      return now - deletedTask.deletedAt < 60000; // 60 seconds
    });
    
    // Update localStorage if we removed expired tasks
    if (validTasks.length !== deletedTasks.length) {
      localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(validTasks));
    }
    
    return validTasks;
  } catch (error) {
    console.error("Failed to load deleted tasks:", error);
    return [];
  }
}

export function addDeletedTask(task: Task): void {
  if (typeof window === "undefined") return;
  try {
    const deletedTasks = getDeletedTasks();
    const deletedTask: DeletedTask = {
      task: ensureLocalTask(task),
      deletedAt: Date.now(),
    };
    
    deletedTasks.push(deletedTask);
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(deletedTasks));
  } catch (error) {
    console.error("Failed to add deleted task:", error);
  }
}

export function removeDeletedTask(taskId: string): void {
  if (typeof window === "undefined") return;
  try {
    const deletedTasks = getDeletedTasks();
    const filteredTasks = deletedTasks.filter((deletedTask: DeletedTask) => 
      deletedTask.task.id !== taskId
    );
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(filteredTasks));
  } catch (error) {
    console.error("Failed to remove deleted task:", error);
  }
}

export function clearDeletedTasks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DELETED_TASKS_KEY);
  } catch (error) {
    console.error("Failed to clear deleted tasks:", error);
  }
}

