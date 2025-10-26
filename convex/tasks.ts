import { mutation, query, MutationCtx } from "./_generated/server";
import { v, Infer } from "convex/values";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";

const taskPayloadValidator = v.object({
  clientId: v.string(),
  title: v.string(),
  description: v.string(),
  color: v.string(),
  section: v.string(),
  completed: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type TaskPayload = Infer<typeof taskPayloadValidator>;

type UpsertResult = "inserted" | "updated" | "skipped";

async function upsertTask(
  ctx: MutationCtx,
  userId: Id<"user">,
  task: TaskPayload,
): Promise<UpsertResult> {
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_user_client", (q) =>
      q.eq("userId", userId).eq("clientId", task.clientId)
    )
    .unique();

  if (!existing) {
    await ctx.db.insert("tasks", {
      ...task,
      userId,
    });
    return "inserted";
  }

  if (existing.updatedAt >= task.updatedAt) {
    return "skipped";
  }

  await ctx.db.patch(existing._id, {
    title: task.title,
    description: task.description,
    color: task.color,
    section: task.section,
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
      section: v.string(),
      completed: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const addTask = mutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    description: v.string(),
    color: v.string(),
    section: v.string(),
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

    await upsertTask(ctx, user._id, {
      clientId: args.clientId,
      title: args.title,
      description: args.description,
      color: args.color,
      section: args.section,
      completed: args.completed,
      createdAt,
      updatedAt,
    });

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_user_client", (q) =>
        q.eq("userId", user._id).eq("clientId", args.clientId)
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
    section: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      title: args.title ?? existing.title,
      description: args.description ?? existing.description,
      color: args.color ?? existing.color,
      section: args.section ?? existing.section,
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
      if (!existing || existing.userId !== user._id) {
        throw new Error("Task not found");
      }

      await ctx.db.delete(args.taskId);
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
      const result = await upsertTask(ctx, user._id, task);
      if (result === "inserted") inserted++;
      else if (result === "updated") updated++;
      else skipped++;
    }

    return { inserted, updated, skipped };
  },
});
