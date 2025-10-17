import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addEmailLead = mutation({
  args: {
    email: v.string(),
    source: v.string(),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  returns: v.id("leadsEmail"),
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingLead = await ctx.db
      .query("leadsEmail")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingLead) {
      throw new Error("Email already exists");
    }

    // Add new email lead
    return await ctx.db.insert("leadsEmail", {
      email: args.email,
      source: args.source,
      userAgent: args.userAgent,
      referrer: args.referrer,
      createdAt: Date.now(),
    });
  },
});

export const getEmailLeads = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("leadsEmail"),
    email: v.string(),
    source: v.string(),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("leadsEmail").collect();
  },
});
