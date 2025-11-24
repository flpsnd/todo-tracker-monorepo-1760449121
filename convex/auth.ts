import { components, internal } from "./_generated/api";
import { query, QueryCtx } from "./_generated/server";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { DataModel } from "./_generated/dataModel";

const siteEnvKeys = [
  "HUB_SITE_URL",
  "TODO_SITE_URL",
  "TRACKER_SITE_URL",
  "NOTES_SITE_URL",
  "STICKIES_SITE_URL",
  "TIMER_SITE_URL",
  "CONVEX_SITE_URL",
] as const;

const configuredSiteUrls = siteEnvKeys
  .map((key) => process.env[key])
  .filter((url): url is string => Boolean(url));

export const normalizeSiteOrigin = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export const allowedAppOrigins = new Set(
  configuredSiteUrls
    .map(normalizeSiteOrigin)
    .filter((origin): origin is string => Boolean(origin)),
);

export const defaultAuthBaseURL =
  process.env.NOTES_SITE_URL ||
  process.env.TODO_SITE_URL ||
  configuredSiteUrls[0] ||
  "http://localhost:3000";

const defaultOrigin = normalizeSiteOrigin(defaultAuthBaseURL);
if (defaultOrigin) {
  allowedAppOrigins.add(defaultOrigin);
}

export const authComponent = createClient<DataModel>(
  components.betterAuth,
  {
    verbose: process.env.NODE_ENV === 'development',
  }
);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) =>
  betterAuth({
    baseURL: (ctx as { __appBaseURL?: string }).__appBaseURL ?? defaultAuthBaseURL,
    logger: {
      disabled: optionsOnly,
      level: process.env.NODE_ENV === 'production' ? "error" : "debug",
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
    trustedOrigins: Array.from(allowedAppOrigins),
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
