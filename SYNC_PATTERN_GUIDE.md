# Local-First to Convex Sync Pattern

## Overview

This guide documents the **local-first with optional cloud sync** pattern used in our apps. All apps work offline with `localStorage`, and upon sign-in, local data is **copied** to Convex where it becomes the source of truth for that user.

## Architecture Principles

1. **Local-First**: Apps work fully offline using browser `localStorage`
2. **One-Time Migration**: Upon authentication, local data syncs to Convex once
3. **Cloud-First After Auth**: Once authenticated, all operations use Convex exclusively
4. **Real-Time**: Convex provides built-in real-time updates across devices
5. **Email-Based Linking**: User data is linked via email (from BetterAuth component)

## Key Concepts

### Client ID (`clientId`)
- Every item created locally gets a unique `clientId` (UUID)
- Used for deduplication during sync: `{userEmail, clientId}` is unique
- Prevents duplicate items when same local data syncs multiple times

### Timestamps
- `createdAt`: When the item was first created (milliseconds)
- `updatedAt`: When the item was last modified (milliseconds)
- Used for conflict resolution: **latest `updatedAt` wins**

### User Identification
- BetterAuth component stores users in its own namespace
- We link app data using `userEmail` (string) instead of `userId` (Id type)
- Email is unique, stable, and accessible from BetterAuth's `getAuthUser()`

## Schema Pattern

### Task Schema Example
```typescript
// convex/schema.ts
tasks: defineTable({
  title: v.string(),
  description: v.string(),
  color: v.string(),
  section: v.string(),
  completed: v.boolean(),
  userEmail: v.string(),      // Links to BetterAuth user
  clientId: v.string(),        // Unique per device/creation
  createdAt: v.number(),       // Millisecond timestamp
  updatedAt: v.number(),       // Millisecond timestamp
})
  .index("by_user", ["userEmail"])
  .index("by_user_client", ["userEmail", "clientId"]),
```

**Key Points:**
- Use `userEmail: v.string()` not `userId: v.id("user")`
- Always include `clientId`, `createdAt`, `updatedAt`
- Index by `userEmail` for efficient queries
- Composite index `["userEmail", "clientId"]` for upserts

## Backend Pattern

### 1. Upsert Helper
```typescript
// convex/tasks.ts (or your data file)
async function upsertTask(
  ctx: MutationCtx,
  userEmail: string,
  task: TaskPayload,
): Promise<"inserted" | "updated" | "skipped"> {
  // Find existing by {userEmail, clientId}
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_user_client", (q) =>
      q.eq("userEmail", userEmail).eq("clientId", task.clientId)
    )
    .unique();

  if (!existing) {
    // Insert new task
    await ctx.db.insert("tasks", { ...task, userEmail });
    return "inserted";
  }

  // Conflict resolution: keep newer data
  if (existing.updatedAt >= task.updatedAt) {
    return "skipped"; // Server has newer/same data
  }

  // Update with local data (it's newer)
  await ctx.db.patch(existing._id, {
    title: task.title,
    description: task.description,
    completed: task.completed,
    updatedAt: task.updatedAt,
    // ...other fields
  });
  return "updated";
}
```

### 2. Sync Mutation
```typescript
export const syncLocalTasks = mutation({
  args: {
    tasks: v.array(taskPayloadValidator),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const task of args.tasks) {
      const result = await upsertTask(ctx, user.email, task);
      if (result === "inserted") inserted++;
      else if (result === "updated") updated++;
      else skipped++;
    }

    return { inserted, updated, skipped };
  },
});
```

### 3. Queries
```typescript
export const getTasks = query({
  args: {},
  returns: v.array(/* task shape */),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userEmail", user.email))
      .collect();
  },
});
```

### 4. Mutations (CRUD)
Always verify ownership using `userEmail`:
```typescript
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    // ...fields to update
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.taskId);
    if (!existing || existing.userEmail !== user.email) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      // ...updates
      updatedAt: Date.now(),
    });
  },
});
```

## Frontend Pattern

### 1. Local Storage Helpers

```typescript
// lib/local-storage.ts

export interface Task {
  id: string;          // Local-only ID (not synced)
  clientId: string;    // Stable UUID for sync
  _id?: string;        // Convex ID (only when synced)
  title: string;
  // ...other fields
  createdAt: number;
  updatedAt: number;
}

export function ensureLocalTask(task: Task): Task {
  const now = Date.now();
  return {
    ...task,
    id: task.id || crypto.randomUUID(),
    clientId: task.clientId || crypto.randomUUID(),
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
  };
}

export function loadLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("tasks");
    const parsed: Task[] = data ? JSON.parse(data) : [];
    return parsed.map(ensureLocalTask); // Ensure all have required fields
  } catch (error) {
    console.error("Failed to load local tasks:", error);
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save local tasks:", error);
  }
}

export function clearLocalTasks(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tasks");
}
```

### 2. Migration Logic

```typescript
// app/page.tsx (or your main component)
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";

export default function Page() {
  const { data: session, isPending: authLoading } = useSession();
  const convexTasks = useQuery(api.tasks.getTasks) ?? [];
  const syncLocalTasksMutation = useMutation(api.tasks.syncLocalTasks);
  
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Load local tasks on mount
  useEffect(() => {
    setLocalTasks(loadLocalTasks());
  }, []);

  // Migration trigger: authenticated + has local tasks + no convex tasks yet
  useEffect(() => {
    const isAuthenticated = !!session?.user;
    
    if (!isAuthenticated || authLoading || isMigrating) return;
    
    const hasLocalTasks = localTasks.length > 0;
    const hasConvexTasks = convexTasks.length > 0;

    if (hasLocalTasks && !hasConvexTasks) {
      // Run migration
      setIsMigrating(true);
      setMigrationError(null);

      syncLocalTasksMutation({
        tasks: localTasks.map(t => ({
          clientId: t.clientId,
          title: t.title,
          description: t.description,
          color: t.color,
          section: t.section,
          completed: t.completed,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      })
        .then(result => {
          console.log("Migration complete:", result);
          // Optionally clear local storage after successful sync
          // clearLocalTasks();
        })
        .catch(error => {
          console.error("Migration failed:", error);
          setMigrationError(error.message);
        })
        .finally(() => {
          setIsMigrating(false);
        });
    }
  }, [session, authLoading, localTasks, convexTasks, isMigrating]);

  // Determine data source
  const isAuthenticated = !!session?.user;
  const tasks = isAuthenticated && !isMigrating ? convexTasks : localTasks;

  // CRUD operations based on auth state
  const addTask = (taskData) => {
    if (isAuthenticated) {
      // Use Convex
      return addTaskMutation({
        clientId: crypto.randomUUID(),
        ...taskData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Use localStorage
      const newTask = ensureLocalTask({
        id: crypto.randomUUID(),
        clientId: crypto.randomUUID(),
        ...taskData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const updated = [...localTasks, newTask];
      setLocalTasks(updated);
      saveLocalTasks(updated);
    }
  };

  // Similar patterns for update, delete, etc.
  
  return (
    <div>
      {isMigrating && <MigrationBanner count={localTasks.length} />}
      {migrationError && <ErrorBanner error={migrationError} onRetry={() => window.location.reload()} />}
      {/* Your UI */}
    </div>
  );
}
```

### 3. Migration UX Components

```typescript
function MigrationBanner({ count }: { count: number }) {
  return (
    <div className="bg-blue-500 text-white p-4">
      Syncing {count} tasks to your account...
    </div>
  );
}

function ErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500 text-white p-4">
      <p>Sync failed: {error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
```

## Multi-Device Behavior

### Scenario: User signs in on multiple devices with different local data

**Device A**: Has tasks `[A1, A2]` locally → signs in → syncs to Convex
**Device B**: Has tasks `[B1, B2]` locally → signs in → syncs to Convex

**Result**: Convex now has `[A1, A2, B1, B2]`

### Scenario: Same task edited on multiple devices before sync

**Device A**: Edits task (clientId: `abc123`) at timestamp `1000`
**Device B**: Edits same task (clientId: `abc123`) at timestamp `2000`

**Result**: Device B's version wins (later `updatedAt`)

## Security Checklist

- ✅ All queries/mutations require authentication
- ✅ All data is scoped by `userEmail`
- ✅ Ownership verified before updates/deletes
- ✅ Indexes include `userEmail` for efficient filtering

## Porting to Other Apps

### 1. Copy Schema Pattern
- Add `userEmail: v.string()`, `clientId: v.string()`, `createdAt: v.number()`, `updatedAt: v.number()` to your table
- Add indexes: `.index("by_user", ["userEmail"]).index("by_user_client", ["userEmail", "clientId"])`

### 2. Copy Backend Pattern
- Implement `upsert<YourItem>` helper with conflict resolution
- Add `syncLocal<YourItems>` mutation
- Update queries to filter by `userEmail`
- Update mutations to verify ownership

### 3. Copy Frontend Pattern
- Ensure local storage items have `clientId`, `createdAt`, `updatedAt`
- Implement migration effect
- Branch CRUD operations based on auth state
- Show migration UI

### 4. Test Scenarios
- [ ] Create items locally while logged out
- [ ] Sign in → verify migration happens
- [ ] Verify items appear in Convex dashboard
- [ ] Create new items while logged in → only use Convex
- [ ] Sign in on second device with different local data
- [ ] Verify both sets merge without duplicates
- [ ] Edit same item on two devices → verify latest wins

## Troubleshooting

### "Task not found" errors
- Verify `userEmail` matches between `getAuthUser()` and stored data
- Check BetterAuth user is in `betterAuth` database, not main `app` database

### Duplicate items after migration
- Ensure `clientId` is stable (generated once, never changes)
- Verify `by_user_client` index includes both `userEmail` and `clientId`

### Migration happens on every reload
- Add a migration flag (e.g., `localStorage.setItem('migrated', 'true')`)
- Or check if `convexTasks.length > 0` to skip re-migration

### Type mismatches with userId
- **Use `userEmail: v.string()`**, not `userId: v.id("user")`
- BetterAuth component has separate namespace, use email as the link

## Summary

This pattern provides:
- 🚀 Instant offline functionality
- 🔄 One-time, automatic sync on sign-in
- 🔒 Secure, user-scoped data
- 📱 Multi-device support with conflict resolution
- 🎯 Reusable across all apps in the monorepo

Follow this guide to implement the same pattern in `tracker`, `notes`, `ide-board`, and `timer` apps.

