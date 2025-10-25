"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { loadLocalSubscriptions, saveLocalSubscriptions, debugLocalStorage, clearLocalSubscriptions } from "@/lib/local-storage"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, Euro, ChevronLeft, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInDialog } from "@/components/sign-in-dialog"
import { SyncStatus } from "@/components/sync-status"
import { Button } from "@/components/ui/button"

// Helper function to get current month in YYYY-MM format
function getCurrentMonthString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

// Helper function to format month for display
function formatMonthDisplay(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Helper function to navigate months
function getPreviousMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 2)
  const newYear = date.getFullYear()
  const newMonth = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${newYear}-${newMonth}`
}

function getNextMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month))
  const newYear = date.getFullYear()
  const newMonth = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${newYear}-${newMonth}`
}

export default function SubscriptionTracker() {
  const TOTAL_SLOTS = 1000
  const GOAL_SLOTS = 400
  const PRICE_PER_CUSTOMER = 6
  const GOAL_AMOUNT = GOAL_SLOTS * PRICE_PER_CUSTOMER

  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [syncStatus, setSyncStatus] = useState<"local-only" | "syncing" | "synced" | "error">("local-only")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<string>(() => getCurrentMonthString())

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusMode') === 'true'
    }
    return false
  })

  // Initialize from localStorage or default to empty array
  const [checkedBoxes, setCheckedBoxes] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      return loadLocalSubscriptions(currentMonth)
    }
    return new Set()
  })

  // Convex queries and mutations
  const subscriptionData = useQuery(api.subscriptions.getSubscriptions as any, { month: currentMonth })
  const syncLocalSubscriptions = useMutation(api.subscriptions.syncLocalSubscriptions as any)
  const updateSubscription = useMutation(api.subscriptions.updateSubscription as any)
  const batchUpdateSubscriptions = useMutation(api.subscriptions.batchUpdateSubscriptions as any)

  // Focus mode persistence
  useEffect(() => {
    localStorage.setItem('focusMode', isFocusMode.toString())
  }, [isFocusMode])

  // Focus mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsFocusMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Initialize sync when user logs in
  useEffect(() => {
    if (session?.user && !hasInitialized) {
      setHasInitialized(true)
      setSyncStatus("syncing")
      
      // Sync local data to Convex
      const localData = Array.from(checkedBoxes)
      syncLocalSubscriptions({ month: currentMonth, checkedSlots: localData })
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
  }, [session?.user, hasInitialized, checkedBoxes, syncLocalSubscriptions, currentMonth])

  // Update local state when Convex data changes
  useEffect(() => {
    if (subscriptionData && session?.user) {
      const convexData = new Set<number>(subscriptionData.checkedSlots)
      setCheckedBoxes(convexData)
      saveLocalSubscriptions(currentMonth, convexData)
      setSyncStatus("synced")
    }
  }, [subscriptionData, session?.user, currentMonth])


  // Load data when month changes
  useEffect(() => {
    console.log(`Loading data for month: ${currentMonth}`)
    const monthData = loadLocalSubscriptions(currentMonth)
    console.log(`Loaded data for ${currentMonth}:`, Array.from(monthData))
    setCheckedBoxes(monthData)
  }, [currentMonth])

  const toggleCheckbox = async (index: number) => {
    const newSet = new Set(checkedBoxes)
    const isChecked = newSet.has(index)
    
    if (isChecked) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    
    setCheckedBoxes(newSet)
    
    // Always save to localStorage immediately
    saveLocalSubscriptions(currentMonth, newSet)

    // If user is logged in, sync to Convex
    if (session?.user) {
      try {
        setSyncStatus("syncing")
        await updateSubscription({ 
          month: currentMonth,
          slotIndex: index, 
          isChecked: !isChecked 
        })
        setSyncStatus("synced")
      } catch (error) {
        console.error("Failed to update subscription:", error)
        setSyncStatus("error")
        // Revert the change on error
        setCheckedBoxes(checkedBoxes)
        // Also revert localStorage
        saveLocalSubscriptions(currentMonth, checkedBoxes)
      }
    }
  }

  // Month navigation functions
  const goToPreviousMonth = () => {
    console.log(`Switching from ${currentMonth} to previous month. Current data:`, Array.from(checkedBoxes))
    // Only save current data if it's not empty
    if (checkedBoxes.size > 0) {
      console.log(`Saving non-empty data for ${currentMonth}`)
      saveLocalSubscriptions(currentMonth, checkedBoxes)
    } else {
      console.log(`Skipping save for ${currentMonth} - data is empty`)
    }
    
    const previousMonth = getPreviousMonth(currentMonth)
    console.log(`Switching to month: ${previousMonth}`)
    setCurrentMonth(previousMonth)
  }

  const goToNextMonth = () => {
    console.log(`Switching from ${currentMonth} to next month. Current data:`, Array.from(checkedBoxes))
    // Only save current data if it's not empty
    if (checkedBoxes.size > 0) {
      console.log(`Saving non-empty data for ${currentMonth}`)
      saveLocalSubscriptions(currentMonth, checkedBoxes)
    } else {
      console.log(`Skipping save for ${currentMonth} - data is empty`)
    }
    
    const nextMonth = getNextMonth(currentMonth)
    console.log(`Switching to month: ${nextMonth}`)
    setCurrentMonth(nextMonth)
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
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance font-mono">{formatMonthDisplay(currentMonth)}</h1>
          </div>
          <div 
            className={`transition-transform duration-300 ease-in-out ${
              isFocusMode ? '-translate-y-[200%]' : 'translate-y-0'
            }`}
          >
            <div className="flex items-center gap-2">
              {session?.user ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{session.user.email}</span>
                  <button
                    onClick={() => authClient.signOut()}
                    className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <SignInDialog>
                  <button className="rounded-lg border border-border p-2 hover:bg-accent transition-colors font-mono text-sm">
                    Sign in
                  </button>
                </SignInDialog>
              )}
              <ThemeToggle />
            </div>
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
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 lg:grid-cols-25 gap-1 w-full">
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
                    className="relative aspect-square border transition-colors duration-200 hover:bg-green-300/30 min-h-[32px] sm:min-h-[28px] md:min-h-[24px]"
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

        {/* Sticky Bottom Navigation */}
        <div 
          className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40 transition-transform duration-300 ease-in-out ${
            isFocusMode ? 'translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="font-mono"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="font-mono"
              >
                Next month
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}