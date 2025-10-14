"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    if (typeof window === "undefined") {
      // During SSR/build, return null to avoid Convex client initialization
      return null;
    }
    
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn("NEXT_PUBLIC_CONVEX_URL is not defined");
      return null;
    }
    
    return new ConvexReactClient(convexUrl, {
      verbose: false,
      expectAuth: true,
    });
  }, []);

  if (!convex) {
    // Fallback for when Convex is not available (SSR/build time)
    return <>{children}</>;
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
