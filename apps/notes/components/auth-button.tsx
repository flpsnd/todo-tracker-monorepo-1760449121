"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { SignInDialog } from "@/components/sign-in-dialog";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        <span className="font-mono text-sm">Loading...</span>
      </div>
    );
  }

  if (session?.user) {
    return (
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex h-10 items-center rounded-lg border border-border px-4 font-mono text-sm transition-colors hover:bg-accent"
      >
        {isSigningOut ? "..." : "Sign out"}
      </button>
    );
  }

  return (
    <SignInDialog>
      <button className="inline-flex h-10 items-center rounded-lg border border-border px-4 font-mono text-sm transition-colors hover:bg-accent">
        Sign in
      </button>
    </SignInDialog>
  );
}

