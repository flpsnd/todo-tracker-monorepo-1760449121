import { components, internal } from "./_generated/api";
import { query, QueryCtx } from "./_generated/server";
import authSchema from "./betterAuth/schema";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { DataModel } from "./_generated/dataModel";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
    verbose: false,
  },
);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) =>
  betterAuth({
    baseURL: siteUrl,
    logger: {
      disabled: optionsOnly,
      level: "debug",
    },
    database: authComponent.adapter(ctx),
    // Disable email/password auth - we only want magic link
    emailAndPassword: {
      enabled: false,
    },
    // Add session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          await requireActionCtx(ctx).runAction(internal.email.sendMagicLink, {
            to: email,
            url,
          });
        },
      }),
      convex(),
    ],
  } satisfies BetterAuthOptions);

// Helper functions for getting the current user
export const safeGetUser = async (ctx: QueryCtx) => {
  return authComponent.safeGetAuthUser(ctx);
};

export const getUser = async (ctx: QueryCtx) => {
  return authComponent.getAuthUser(ctx);
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return safeGetUser(ctx);
  },
});
