import { mutation, query, MutationCtx } from "./_generated/server";
import { v, Infer } from "convex/values";
import { authComponent } from "./auth";

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

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_user_client", (q) =>
        q.eq("userEmail", user.email).eq("clientId", args.clientId)
      )
      .unique();
    return existing?._id ?? null;
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

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userEmail !== user.email) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      title: args.title ?? existing.title,
      description: args.description ?? existing.description,
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
      console.error("Error in deleteTask mutation:", error);
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
