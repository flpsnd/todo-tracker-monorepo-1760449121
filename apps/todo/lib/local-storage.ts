import type { Task } from "@/app/page";

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
    _id: task._id,
    position: task.position ?? task.createdAt ?? Date.now(),
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
    position: task.position ?? task.createdAt ?? now,
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
    const sanitized = tasks.map(ensureLocalTask).map((task) => ({
      ...task,
      position: task.position ?? task.createdAt ?? Date.now(),
    }));
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
      _id: newId,
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
