import { mutation, query, MutationCtx } from "./_generated/server";
import { v, Infer } from "convex/values";
import { authComponent } from "./auth";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TASKS_PER_USER = 10000; // Maximum tasks a user can have

// Rate limiting configuration
const RATE_LIMITS = {
  addTask: { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
  updateTask: { maxRequests: 120, windowMs: 60000 }, // 120 requests per minute
  deleteTask: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  syncLocalTasks: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute (bulk operation)
};

// Allowed color values (must match frontend COLORS array)
const ALLOWED_COLORS = [
  "#ffb3ba",
  "#ffdfba",
  "#ffffba",
  "#baffc9",
  "#bae1ff",
  "#e0bbff",
  "#ffffff",
  "#000000",
];

function validateColor(color: string): void {
  if (!ALLOWED_COLORS.includes(color.toLowerCase())) {
    throw new Error("Invalid color value. Color must be from the allowed set.");
  }
}

// Rate limiting helper
async function checkRateLimit(
  ctx: MutationCtx,
  userEmail: string,
  operation: keyof typeof RATE_LIMITS
): Promise<void> {
  const limit = RATE_LIMITS[operation];
  if (!limit) return; // No rate limit configured for this operation

  const now = Date.now();
  const windowStart = now - (now % limit.windowMs);

  // Find existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_operation", (q) =>
      q.eq("userEmail", userEmail).eq("operation", operation)
    )
    .unique();

  if (existing) {
    // Check if we're in a new time window
    if (existing.windowStart < windowStart) {
      // Reset count for new window
      await ctx.db.patch(existing._id, {
        count: 1,
        windowStart: windowStart,
        updatedAt: now,
      });
    } else {
      // Check if limit exceeded
      if (existing.count >= limit.maxRequests) {
        throw new Error(
          `Rate limit exceeded for ${operation}. Maximum ${limit.maxRequests} requests per ${limit.windowMs / 1000} seconds.`
        );
      }
      // Increment count
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        updatedAt: now,
      });
    }
  } else {
    // Create new rate limit record
    await ctx.db.insert("rateLimits", {
      userEmail,
      operation,
      count: 1,
      windowStart: windowStart,
      updatedAt: now,
    });
  }
}

// Check task count limit
async function checkTaskLimit(
  ctx: MutationCtx,
  userEmail: string
): Promise<void> {
  const taskCount = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q) => q.eq("userEmail", userEmail))
    .filter((q) => q.neq(q.field("isDeleted"), true))
    .collect();

  if (taskCount.length >= MAX_TASKS_PER_USER) {
    throw new Error(
      `Maximum task limit reached. You can have up to ${MAX_TASKS_PER_USER} tasks. Please delete some tasks to create new ones.`
    );
  }
}

const taskPayloadValidator = v.object({
  clientId: v.string(),
  title: v.string(),
  description: v.string(),
  color: v.string(),
  dueDate: v.string(), // ISO date string (YYYY-MM-DD)
  completed: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type TaskPayload = Infer<typeof taskPayloadValidator>;

type UpsertResult = "inserted" | "updated" | "skipped";

async function upsertTask(
  ctx: MutationCtx,
  userEmail: string,
  task: TaskPayload,
): Promise<UpsertResult> {
  // Validate input lengths
  if (task.title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
  }
  if (task.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }
  
  // Validate color
  validateColor(task.color);
  
  // Validate dueDate format (YYYY-MM-DD)
  if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
    throw new Error("dueDate must be in YYYY-MM-DD format");
  }
  
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_user_client", (q) =>
      q.eq("userEmail", userEmail).eq("clientId", task.clientId)
    )
    .unique();

  if (!existing) {
    await ctx.db.insert("tasks", {
      ...task,
      userEmail,
    });
    return "inserted";
  }

  if (existing.updatedAt >= task.updatedAt) {
    return "skipped";
  }

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

  await ctx.db.patch(existing._id, {
    title: task.title,
    description: task.description,
    color: task.color,
    dueDate: dueDate,
    completed: task.completed,
    updatedAt: task.updatedAt,
  });
  return "updated";
}

export const getTasks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      clientId: v.string(),
      title: v.string(),
      description: v.string(),
      color: v.string(),
      dueDate: v.string(),
      completed: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      userEmail: v.string(),
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userEmail", user.email))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const addTask = mutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    description: v.string(),
    color: v.string(),
    dueDate: v.string(),
    completed: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check rate limit
    await checkRateLimit(ctx, user.email, "addTask");
    
    // Check task limit before adding (only check for new inserts, not updates)
    const existingTask = await ctx.db
      .query("tasks")
      .withIndex("by_user_client", (q) =>
        q.eq("userEmail", user.email).eq("clientId", args.clientId)
      )
      .unique();
    
    if (!existingTask) {
      // Only check limit when creating a new task, not updating existing
      await checkTaskLimit(ctx, user.email);
    }

    const now = Date.now();
    const createdAt = args.createdAt ?? now;
    const updatedAt = args.updatedAt ?? now;

    await upsertTask(ctx, user.email, {
      clientId: args.clientId,
      title: args.title,
      description: args.description,
      color: args.color,
      dueDate: args.dueDate,
      completed: args.completed,
      createdAt,
      updatedAt,
    });

    const insertedTask = await ctx.db
      .query("tasks")
      .withIndex("by_user_client", (q) =>
        q.eq("userEmail", user.email).eq("clientId", args.clientId)
      )
      .unique();
    return insertedTask?._id ?? null;
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check rate limit
    await checkRateLimit(ctx, user.email, "updateTask");

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userEmail !== user.email) {
      throw new Error("Task not found");
    }

    // Validate input lengths
    const titleToUpdate = args.title ?? existing.title;
    const descriptionToUpdate = args.description ?? existing.description;
    
    if (titleToUpdate.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
    }
    if (descriptionToUpdate.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }
    
    // Validate color if provided
    const colorToUpdate = args.color ?? existing.color;
    validateColor(colorToUpdate);
    
    // Validate dueDate format if provided
    const dueDateToUpdate = args.dueDate ?? existing.dueDate;
    if (dueDateToUpdate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDateToUpdate)) {
      throw new Error("dueDate must be in YYYY-MM-DD format");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      title: titleToUpdate,
      description: descriptionToUpdate,
      color: args.color ?? existing.color,
      dueDate: args.dueDate ?? existing.dueDate,
      completed: args.completed ?? existing.completed,
      updatedAt: now,
    });
  },
});

export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    try {
      const user = await authComponent.safeGetAuthUser(ctx);
      if (!user) throw new Error("Not authenticated");

      // Check rate limit
      await checkRateLimit(ctx, user.email, "deleteTask");

      const existing = await ctx.db.get(args.taskId);
      if (!existing || existing.userEmail !== user.email) {
        throw new Error("Task not found");
      }

      // Soft delete instead of hard delete
      await ctx.db.patch(args.taskId, {
        isDeleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      // Log error with context for production debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in deleteTask mutation:", {
        error: errorMessage,
        taskId: args.taskId,
        timestamp: Date.now(),
      });
      throw error;
    }
  },
});

export const syncLocalTasks = mutation({
  args: {
    tasks: v.array(taskPayloadValidator),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check rate limit (stricter for bulk operations)
    await checkRateLimit(ctx, user.email, "syncLocalTasks");
    
    // Validate array length
    if (args.tasks.length > 1000) {
      throw new Error("Cannot sync more than 1000 tasks at once");
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const task of args.tasks) {
      const result = await upsertTask(ctx, user.email, task);
      if (result === "inserted") inserted++;
      else if (result === "updated") updated++;
      else skipped++;
    }

    return { inserted, updated, skipped };
  },
});

export const restoreTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userEmail !== user.email) {
      throw new Error("Task not found");
    }

    // Check if task was deleted within last 60 seconds
    if (!existing.isDeleted || !existing.deletedAt) {
      throw new Error("Task is not deleted");
    }

    const now = Date.now();
    const deletedAt = existing.deletedAt;
    if (now - deletedAt > 60000) {
      throw new Error("Task cannot be restored after 60 seconds");
    }

    // Restore the task
    await ctx.db.patch(args.taskId, {
      isDeleted: undefined,
      deletedAt: undefined,
      updatedAt: now,
    });
  },
});

export const permanentlyDeleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userEmail !== user.email) {
      throw new Error("Task not found");
    }

    // Actually delete the task from database
    await ctx.db.delete(args.taskId);
  },
});
