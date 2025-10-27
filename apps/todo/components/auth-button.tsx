"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Mail } from "lucide-react";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage("");

    try {
      // Use the correct BetterAuth magic link method
      await signIn.magicLink({ 
        email,
        callbackURL: window.location.origin,
      });
      setMessage("Check your email for the magic link!");
    } catch (error) {
      console.error("Sign in error:", error);
      setMessage("Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
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
      <Button
        onClick={handleSignOut}
        variant="outline"
        size="sm"
        className="font-mono text-sm"
      >
        <LogOut className="h-4 w-4 mr-1" />
        Sign out
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={handleSignIn} className="flex items-center gap-2">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="font-mono text-sm w-40"
          required
        />
        <Button
          type="submit"
          disabled={isLoading || !email.trim()}
          size="sm"
          className="font-mono text-sm"
        >
          {isLoading ? "..." : "Sign in"}
        </Button>
      </form>
      {message && (
        <div className="font-mono text-xs text-muted-foreground max-w-32 truncate">
          {message}
        </div>
      )}
    </div>
  );
}
