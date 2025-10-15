"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";

interface SignInDialogProps {
  children: React.ReactNode;
}

export function SignInDialog({ children }: SignInDialogProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage("");

    try {
      await authClient.signIn.magicLink({
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Sign in to sync your subscriptions</DialogTitle>
          <DialogDescription className="font-mono text-sm">
            Enter your email to receive a magic link for secure authentication.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono"
              required
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={isLoading || !email.trim()}
            className="w-full font-mono"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isLoading ? "Sending..." : "Send magic link"}
          </Button>
          {message && (
            <div className={`font-mono text-sm text-center ${
              message.includes("Check your email") ? "text-green-600" : "text-red-600"
            }`}>
              {message}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
