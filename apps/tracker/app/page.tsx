"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { loadLocalSubscriptions, saveLocalSubscriptions } from "@/lib/local-storage"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, Euro } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthButton } from "@/components/auth-button"
import { SyncStatus } from "@/components/sync-status"

export default function SubscriptionTracker() {
  const TOTAL_SLOTS = 1000
  const GOAL_SLOTS = 400
  const PRICE_PER_CUSTOMER = 6
  const GOAL_AMOUNT = GOAL_SLOTS * PRICE_PER_CUSTOMER

  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [syncStatus, setSyncStatus] = useState<"local-only" | "syncing" | "synced" | "error">("local-only")
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize from localStorage or default to empty array
  const [checkedBoxes, setCheckedBoxes] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      return loadLocalSubscriptions()
    }
    return new Set()
  })

  // Convex queries and mutations
  const subscriptionData = useQuery(api.subscriptions.getSubscriptions)
  const syncLocalSubscriptions = useMutation(api.subscriptions.syncLocalSubscriptions)
  const updateSubscription = useMutation(api.subscriptions.updateSubscription)
  const batchUpdateSubscriptions = useMutation(api.subscriptions.batchUpdateSubscriptions)

  // Initialize sync when user logs in
  useEffect(() => {
    if (session?.user && !hasInitialized) {
      setHasInitialized(true)
      setSyncStatus("syncing")
      
      // Sync local data to Convex
      const localData = Array.from(checkedBoxes)
      syncLocalSubscriptions({ checkedSlots: localData })
        .then(() => {
          setSyncStatus("synced")
        })
        .catch((error) => {
          console.error("Failed to sync local data:", error)
          setSyncStatus("error")
        })
    } else if (!session?.user && hasInitialized) {
      setHasInitialized(false)
      setSyncStatus("local-only")
    }
  }, [session?.user, hasInitialized, checkedBoxes, syncLocalSubscriptions])

  // Update local state when Convex data changes
  useEffect(() => {
    if (subscriptionData && session?.user) {
      const convexData = new Set<number>(subscriptionData.checkedSlots)
      setCheckedBoxes(convexData)
      saveLocalSubscriptions(convexData)
      setSyncStatus("synced")
    }
  }, [subscriptionData, session?.user])

  // Save to localStorage whenever checkedBoxes changes (for offline mode)
  useEffect(() => {
    if (!session?.user) {
      saveLocalSubscriptions(checkedBoxes)
    }
  }, [checkedBoxes, session?.user])

  const toggleCheckbox = async (index: number) => {
    const newSet = new Set(checkedBoxes)
    const isChecked = newSet.has(index)
    
    if (isChecked) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    
    setCheckedBoxes(newSet)

    // If user is logged in, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        await updateSubscription({ 
          slotIndex: index, 
          isChecked: !isChecked 
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to update subscription:", error)
        setSyncStatus("error")
        // Revert the change on error
        setCheckedBoxes(checkedBoxes)
      }
    }
  }

  const activeCount = checkedBoxes.size
  const currentRevenue = activeCount * PRICE_PER_CUSTOMER
  const progressPercentage = (activeCount / GOAL_SLOTS) * 100

  const getMilestoneStatus = (milestone: number) => {
    if (activeCount >= milestone) return "complete"
    return "incomplete"
  }

  const milestones = [
    { count: 200, label: "Sustainable", dotColor: "#ffb3ba" },
    { count: 300, label: "Growth", dotColor: "#ffdfba" },
    { count: 400, label: "Made it", dotColor: "#baffc9" },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance font-mono">Subscription Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>

        {/* Sync Status */}
        {session?.user && (
          <div className="flex items-center justify-center">
            <SyncStatus status={syncStatus} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground font-mono">Active Customers</p>
                <p className="text-3xl font-bold font-mono">{activeCount}</p>
                <p className="text-xs text-muted-foreground font-mono">of {GOAL_SLOTS} goal</p>
              </div>
              <Users className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground font-mono">Current Revenue</p>
                <p className="text-3xl font-bold font-mono">€{currentRevenue}</p>
                <p className="text-xs text-muted-foreground font-mono">of €{GOAL_AMOUNT} goal</p>
              </div>
              <Euro className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground font-mono">Progress</p>
                <p className="text-3xl font-bold font-mono">{progressPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground font-mono">completion rate</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-mono">Overall Progress</h2>
              <span className="text-sm font-mono text-muted-foreground">
                €{currentRevenue} / €{GOAL_AMOUNT}
              </span>
            </div>
            <Progress value={Math.min(progressPercentage, 100)} className="h-3" />

            {/* Milestones */}
            <div className="flex items-center justify-between pt-2">
              {milestones.map((milestone) => (
                <div key={milestone.count} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3"
                    style={{
                      backgroundColor: getMilestoneStatus(milestone.count) === "complete"
                        ? milestone.dotColor
                        : "hsl(var(--muted-foreground) / 0.2)"
                    }}
                  />
                  </div>
                  <span
                    className={`text-xs font-medium font-mono ${
                      getMilestoneStatus(milestone.count) === "complete"
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {milestone.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{milestone.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Checkbox Grid */}
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-mono">Customer Slots</h2>
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-25 gap-1">
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => i).map((index) => {
                const isChecked = checkedBoxes.has(index)
                const isMilestone = index + 1 === 200 || index + 1 === 300 || index + 1 === 400

                let milestoneColor = ""
                if (isMilestone) {
                  if (index + 1 === 200) milestoneColor = "#ffb3ba"
                  else if (index + 1 === 300) milestoneColor = "#ffdfba"
                  else if (index + 1 === 400) milestoneColor = "#baffc9"
                }

                return (
                  <button
                    key={index}
                    onClick={() => toggleCheckbox(index)}
                    className="relative aspect-square border transition-all duration-200 hover:scale-125 min-h-[44px] sm:min-h-[32px]"
                    style={{
                      backgroundColor: isChecked ? "rgb(186, 255, 201)" : undefined,
                      borderColor: isChecked ? "rgb(186, 255, 201)" : undefined,
                    }}
                    title={`Customer ${index + 1} - €${PRICE_PER_CUSTOMER}`}
                    aria-label={`Customer slot ${index + 1}`}
                  >
                    {isMilestone && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: milestoneColor }}
                      >
                        <svg
                          className="w-3 h-3 text-black"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center font-mono">
              Click any box to toggle customer subscription status • Each customer = €{PRICE_PER_CUSTOMER} •{" "}
              {TOTAL_SLOTS} total slots available
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}