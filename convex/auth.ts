import { components, internal } from "./_generated/api";
import { query, QueryCtx } from "./_generated/server";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { DataModel } from "./_generated/dataModel";

// In production, Convex environment should have TODO_SITE_URL set to https://tasks.caalm.app
const siteUrl = process.env.TODO_SITE_URL || "http://localhost:3000";

export const authComponent = createClient<DataModel>(
  components.betterAuth,
  {
    verbose: true,
  }
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
    emailAndPassword: {
      enabled: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 0,
    },
    trustedOrigins: [
      process.env.HUB_SITE_URL!,
      process.env.TODO_SITE_URL!,
      process.env.TRACKER_SITE_URL!,
      process.env.NOTES_SITE_URL!,
      process.env.STICKIES_SITE_URL!,
      process.env.TIMER_SITE_URL!,
      process.env.CONVEX_SITE_URL!,
    ],
    plugins: [
      convex(),
      magicLink({
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          await requireActionCtx(ctx).runAction(internal.email.sendMagicLink, {
            to: email,
            url,
          });
        },
      }),
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
