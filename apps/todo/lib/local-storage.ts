import type { Task } from "@/app/page";

const STORAGE_KEY = "todo-tasks-local";
const DELETED_TASKS_KEY = "todo-deleted-tasks";

export interface DeletedTask {
  task: Task;
  deletedAt: number;
  timeoutId?: number;
}

export function loadLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load local tasks:", error);
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
      task,
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
