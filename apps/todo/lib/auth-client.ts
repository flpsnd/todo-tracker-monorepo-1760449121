import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

function resolveBaseURL(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL (or VERCEL_URL) must be defined for BetterAuth SSR");
  }

  return `${appUrl}/api/auth`;
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
  credentials: "include", // Critical for cookies
  plugins: [
    convexClient(), // This plugin handles token management for Convex
  ],
});

export const { signIn, signOut, useSession } = authClient;
