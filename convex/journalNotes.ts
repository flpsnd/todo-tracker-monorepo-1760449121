import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { Id } from "./_generated/dataModel";

function isLikelyConvexId(value: string): boolean {
  // Convex IDs are lowercase base32 strings with no separators.
  return /^[a-z0-9]+$/.test(value);
}

function isInvalidConvexIdError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Unable to decode ID")
  );
}

export const getJournalNotes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("journalNotes"),
      _creationTime: v.number(),
      title: v.string(),
      content: v.string(),
      userEmail: v.string(),
      clientId: v.string(),
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
      .query("journalNotes")
      .withIndex("by_user", (q) => q.eq("userEmail", user.email))
      .order("desc")
      .collect();
  },
});

export const addJournalNote = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    clientId: v.optional(v.string()), // Optional clientId for migration mapping
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("journalNotes"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("journalNotes", {
      title: args.title,
      content: args.content,
      userEmail: user.email,
      clientId: args.clientId || crypto.randomUUID(), // Use provided clientId or generate one
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  },
});

export const updateJournalNote = mutation({
  args: {
    id: v.id("journalNotes"),
    title: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note not found");
    }

    if (note.userEmail !== user.email) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      content: args.content,
      updatedAt: args.updatedAt,
    });

    return null;
  },
});

export const deleteJournalNote = mutation({
  args: {
    id: v.id("journalNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note not found");
    }

    if (note.userEmail !== user.email) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const syncLocalJournalNotes = mutation({
  args: {
    notes: v.array(
      v.object({
        id: v.string(), // Local UUID (clientId)
        title: v.string(),
        content: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  returns: v.record(v.string(), v.string()), // Return mapping: clientId -> Convex ID (as string)
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const idMapping: Record<string, string> = {};

    // Process each local note
    for (const localNote of args.notes) {
      const clientId = localNote.id; // The local UUID or Convex _id

      let existingNote = null;

      // 1. Try to treat the incoming id as a Convex document id (skip obvious non-Convex IDs)
      if (isLikelyConvexId(clientId)) {
        try {
          existingNote = (await ctx.db.get(clientId as Id<"journalNotes">)) ?? null;
        } catch (error) {
          if (!isInvalidConvexIdError(error)) {
            throw error;
          }
        }

        if (existingNote && existingNote.userEmail !== user.email) {
          // Ignore documents that don't belong to the user
          existingNote = null;
        }
      }

      // 2. If not found by _id, fall back to legacy clientId lookup
      if (!existingNote) {
        existingNote = await ctx.db
          .query("journalNotes")
          .withIndex("by_user_client", (q) =>
            q.eq("userEmail", user.email).eq("clientId", clientId)
          )
          .unique();
      }

      if (existingNote) {
        // Update if local note is newer
        if (localNote.updatedAt > existingNote.updatedAt) {
          await ctx.db.patch(existingNote._id, {
            title: localNote.title,
            content: localNote.content,
            updatedAt: localNote.updatedAt,
          });
        }
        idMapping[clientId] = existingNote._id;
      } else {
        // Create new note with clientId (which may already be a Convex id string)
        const convexId = await ctx.db.insert("journalNotes", {
          title: localNote.title,
          content: localNote.content,
          userEmail: user.email,
          clientId,
          createdAt: localNote.createdAt,
          updatedAt: localNote.updatedAt,
        });
        idMapping[clientId] = convexId;
      }
    }

    return idMapping;
  },
});

