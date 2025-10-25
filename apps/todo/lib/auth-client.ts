import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  // Point to your Next.js app's auth proxy endpoint
  baseURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`,
  plugins: [convexClient()],
});
