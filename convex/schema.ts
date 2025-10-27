import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Our tasks table
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    color: v.string(),
    section: v.string(),
    completed: v.boolean(),
    userEmail: v.string(),
    clientId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userEmail"]).index("by_user_client", ["userEmail", "clientId"]),

  // Subscriptions table for tracker app
  subscriptions: defineTable({
    userId: v.id("user"),
    month: v.string(),
    checkedSlots: v.array(v.number()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_and_month", ["userId", "month"]),

  // Notes table for ide-board app
  notes: defineTable({
    content: v.string(),
    color: v.string(),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
    userId: v.id("user"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // BetterAuth tables (merged from betterAuth/schema.ts)
  user: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("email", ["email"]),
  
  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    userId: v.id("user"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("token", ["token"]),
  
  account: defineTable({
    userId: v.id("user"),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    password: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("accountId", ["accountId"]),
  
  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("identifier", ["identifier"]),

  // Email leads table for newsletter signups
  leadsEmail: defineTable({
    email: v.string(),
    source: v.string(), // e.g., "hub", "todo", "tracker", etc.
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    createdAt: v.number(),
  }).index("email", ["email"]),
});
