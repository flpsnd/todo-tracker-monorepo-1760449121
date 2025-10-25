# Authentication Issue Documentation

## Problem Summary

The Todo app has a critical authentication issue where Better Auth sessions are not being properly passed to Convex mutations, causing all authenticated operations to fail with "Unauthenticated" errors.

## Current Behavior

1. **User Authentication Works**: Users can sign in via Better Auth magic link authentication
2. **Client-Side Auth Works**: `hasSession: true` and user data is available on the client
3. **Convex Mutations Fail**: All mutations (`syncLocalTasks`, `addTask`, etc.) fail with "Unauthenticated" errors
4. **Migration Fails**: Local tasks cannot be migrated to Convex database
5. **Infinite Loop**: App keeps retrying failed mutations, causing error spam

## Error Details

### Client-Side Logs
```
Auth state: {session: {session: {...}, user: {...}}, hasSession: true, user: {...}}
Migration effect triggered: {hasSession: true, convexTaskDocs: 0, isMigrating: false}
Starting migration of local tasks to Convex... 1
```

### Server-Side Logs (Convex)
```
syncLocalTasks mutation called with args: { tasks: [...] }
Error in syncLocalTasks mutation: [Error: Unauthenticated]
Uncaught Error: Unauthenticated at getAuthUser
```

## Technical Architecture

### Current Setup
- **Authentication**: Better Auth with magic link
- **Database**: Convex with Better Auth integration
- **Client**: Next.js app with Convex React client
- **Integration**: `@convex-dev/better-auth` package

### File Structure
```
/apps/todo/
├── lib/
│   ├── auth-client.ts          # Better Auth client config
│   └── convex-provider.tsx     # Convex client with Better Auth integration
├── convex/
│   ├── auth.ts                 # Better Auth server config
│   └── tasks.ts                # Convex functions (failing)
└── app/page.tsx               # Main component with migration logic

/convex/
└── tasks.ts                   # Root Convex functions (also failing)
```

## Root Cause Analysis

### The Core Issue
The Better Auth session is not being properly passed from the client to Convex mutations. The authentication token exists on the client side but is not reaching the server-side Convex functions.

### Evidence
1. **Client shows authenticated**: `hasSession: true`, user data available
2. **Server shows unauthenticated**: `getAuthUser(ctx)` returns `undefined`
3. **Token not passed**: The authentication context is not reaching Convex

## Attempted Fixes (All Failed)

### Fix 1: Convex Client Configuration
**Problem**: `expectAuth: false` was preventing authentication from being passed
**Attempted**: Changed to `expectAuth: true`
**Result**: Still failed with same "Unauthenticated" error

### Fix 2: Authentication Function Changes
**Problem**: Using `safeGetAuthUser` instead of `getAuthUser`
**Attempted**: Changed all mutations to use `getAuthUser(ctx)`
**Result**: Still failed with "Unauthenticated" error

### Fix 3: Migration Logic Protection
**Problem**: localStorage was being overwritten before migration
**Attempted**: Added `isMigrating` state and localStorage protection
**Result**: Migration logic works, but authentication still fails

### Fix 4: Debugging and Logging
**Problem**: Need to understand what's happening
**Attempted**: Added extensive logging to track authentication flow
**Result**: Confirmed that authentication is not reaching Convex

## Current Configuration

### Client-Side (apps/todo/lib/auth-client.ts)
```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_TODO_APP_URL || "http://localhost:3000",
  plugins: [convexClient(), magicLinkClient()],
});
```

### Convex Provider (apps/todo/lib/convex-provider.tsx)
```typescript
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  verbose: false,
  expectAuth: false, // Allow unauthenticated requests, handle auth in functions
});

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

### Server-Side Auth (convex/auth.ts)
```typescript
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
    verbose: false,
  },
);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    plugins: [
      magicLink({...}),
      convex(),
    ],
  });
```

### Convex Functions (convex/tasks.ts)
```typescript
export const syncLocalTasks = mutation({
  args: { tasks: v.array(...) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx); // FAILS HERE
    // ... rest of function
  },
});
```

## Key Questions for Investigation

1. **Authentication Token Passing**: How does Better Auth pass the session token to Convex?
2. **ConvexBetterAuthProvider**: Is this properly connecting the auth client to Convex?
3. **Session Synchronization**: Is there a timing issue between Better Auth and Convex?
4. **Environment Variables**: Are the auth URLs and configurations correct?

## Potential Solutions to Investigate

### Solution 1: Manual Token Passing
Instead of relying on automatic integration, manually pass the authentication token to Convex mutations.

### Solution 2: Different Authentication Method
Use a different approach to get the user in Convex functions, possibly through the request context.

### Solution 3: Better Auth Configuration
There might be a missing configuration in the Better Auth setup that's preventing proper integration.

### Solution 4: Convex Client Setup
The Convex client might need different configuration to properly handle Better Auth sessions.

## Environment Variables

Current environment variables that might be relevant:
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_TODO_APP_URL`
- `TODO_SITE_URL`
- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`
- `RESEND_DOMAIN`

## Testing Steps

1. **Check Authentication Flow**:
   - User signs in → Better Auth creates session
   - Client shows `hasSession: true`
   - Convex mutation called → Should receive authentication

2. **Debug Authentication Context**:
   - Add logging to see what's in the Convex context
   - Check if authentication headers are being sent
   - Verify Better Auth session is properly created

3. **Test Different Approaches**:
   - Try manual token passing
   - Test with different Convex client configurations
   - Verify Better Auth integration is working

## Files to Focus On

1. **`apps/todo/lib/convex-provider.tsx`** - Convex client configuration
2. **`apps/todo/lib/auth-client.ts`** - Better Auth client setup
3. **`convex/auth.ts`** - Server-side Better Auth configuration
4. **`convex/tasks.ts`** - Failing Convex functions
5. **`apps/todo/app/page.tsx`** - Migration logic (lines 196-242)

## Expected Outcome

Once fixed, the authentication flow should work as follows:
1. User signs in → Better Auth creates session
2. Client calls Convex mutation → Authentication token is passed
3. Convex function receives authenticated request
4. `authComponent.getAuthUser(ctx)` returns user object
5. Mutation succeeds and saves data to Convex database
6. Local tasks are migrated to Convex and sync across devices

## Additional Resources

- [Better Auth Documentation](https://better-auth.com)
- [Convex Better Auth Integration](https://docs.convex.dev/auth/better-auth)
- [Convex Authentication Guide](https://docs.convex.dev/auth)

## Deployment URLs

- **Todo App**: https://todo-al0044l60-flpsnds-projects.vercel.app
- **Convex Dashboard**: https://next-herring-619.convex.cloud

## Contact

This issue was documented on October 25, 2025. The authentication integration between Better Auth and Convex is not working properly, preventing users from syncing their local tasks to the cloud database.
