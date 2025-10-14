import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return subscription;
  },
});

export const syncLocalSubscriptions = mutation({
  args: {
    checkedSlots: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    
    // Check if user already has subscription data
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingSubscription) {
      // Update existing subscription
      return await ctx.db.patch(existingSubscription._id, {
        checkedSlots: args.checkedSlots,
        updatedAt: now,
      });
    } else {
      // Create new subscription
      return await ctx.db.insert("subscriptions", {
        userId: user._id,
        checkedSlots: args.checkedSlots,
        updatedAt: now,
      });
    }
  },
});

export const updateSubscription = mutation({
  args: {
    slotIndex: v.number(),
    isChecked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!subscription) {
      // Create new subscription with this slot
      const now = Date.now();
      return await ctx.db.insert("subscriptions", {
        userId: user._id,
        checkedSlots: args.isChecked ? [args.slotIndex] : [],
        updatedAt: now,
      });
    }

    const now = Date.now();
    let newCheckedSlots = [...subscription.checkedSlots];
    
    if (args.isChecked) {
      if (!newCheckedSlots.includes(args.slotIndex)) {
        newCheckedSlots.push(args.slotIndex);
      }
    } else {
      newCheckedSlots = newCheckedSlots.filter(slot => slot !== args.slotIndex);
    }

    return await ctx.db.patch(subscription._id, {
      checkedSlots: newCheckedSlots,
      updatedAt: now,
    });
  },
});

export const batchUpdateSubscriptions = mutation({
  args: {
    checkedSlots: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (!subscription) {
      // Create new subscription
      return await ctx.db.insert("subscriptions", {
        userId: user._id,
        checkedSlots: args.checkedSlots,
        updatedAt: now,
      });
    }

    // Update existing subscription
    return await ctx.db.patch(subscription._id, {
      checkedSlots: args.checkedSlots,
      updatedAt: now,
    });
  },
});
