import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getNotes = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("notes"),
    _creationTime: v.number(),
    content: v.string(),
    color: v.string(),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const addNote = mutation({
  args: {
    content: v.string(),
    color: v.string(),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("notes", {
      ...args,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    rotation: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { noteId, ...updates } = args;
    const now = Date.now();
    
    await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: now,
    });
    return null;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.delete(args.noteId);
    return null;
  },
});

export const syncLocalNotes = mutation({
  args: {
    notes: v.array(v.object({
      content: v.string(),
      color: v.string(),
      x: v.number(),
      y: v.number(),
      rotation: v.number(),
    })),
  },
  returns: v.array(v.id("notes")),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    const noteIds = [];

    for (const note of args.notes) {
      const noteId = await ctx.db.insert("notes", {
        ...note,
        userId: user._id,
        createdAt: now,
        updatedAt: now,
      });
      noteIds.push(noteId);
    }

    return noteIds;
  },
});
