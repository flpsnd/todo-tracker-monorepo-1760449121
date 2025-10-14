import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getTasks = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const addTask = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    color: v.string(),
    section: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("tasks", {
      ...args,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { taskId, ...updates } = args;
    const now = Date.now();
    
    return await ctx.db.patch(taskId, {
      ...updates,
      updatedAt: now,
    });
  },
});

export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.delete(args.taskId);
  },
});

export const syncLocalTasks = mutation({
  args: {
    tasks: v.array(v.object({
      title: v.string(),
      description: v.string(),
      color: v.string(),
      section: v.string(),
      completed: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    const taskIds = [];

    for (const task of args.tasks) {
      const taskId = await ctx.db.insert("tasks", {
        ...task,
        userId: user._id,
        createdAt: now,
        updatedAt: now,
      });
      taskIds.push(taskId);
    }

    return taskIds;
  },
});
