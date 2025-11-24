"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ClientBottomBar() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  const addEmailLead = useMutation(api.leadsEmail.addEmailLead)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await addEmailLead({
        email: email.trim(),
        source: "hub",
        userAgent: navigator.userAgent,
        referrer: document.referrer || undefined,
      })
      
      setIsSubmitted(true)
      setEmail("")
    } catch (err) {
      if (err instanceof Error && err.message === "Email already exists") {
        setError("This email is already subscribed")
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-8 z-50">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-start">
            <form className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Join newsletter"
                className="w-64 font-mono text-sm"
                disabled
              />
              <Button 
                disabled
                variant="outline"
                className="font-mono h-9"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-8 z-50">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-start">
            <p className="font-mono text-sm text-muted-foreground">
              Thanks for subscribing! We'll keep you updated on Caalm.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-8 z-50">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-start">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="Join caalm newsletter"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-64 font-mono text-sm"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !email}
              className="font-mono h-9"
            >
              {isSubmitting ? "..." : "Subscribe"}
            </Button>
          </form>
        </div>
        
        {error && (
          <div className="mt-2">
            <p className="font-mono text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
