# Authentication Issues Analysis

## Project Overview

This is a **monorepo** containing multiple micro-apps sharing a single Convex backend:

### Architecture
- **Backend**: Single Convex deployment (`next-herring-619.convex.cloud`)
- **Frontend Apps**: 5 separate Next.js apps deployed on Vercel
  - `todo` → https://tasks.caalm.app
  - `tracker` → https://tracker.caalm.app  
  - `timer` → https://timer.caalm.app
  - `notes` → https://notes.caalm.app
  - `ide-board` → https://ide-board.caalm.app
- **Authentication**: Better Auth with session-based authentication
- **Database**: Convex with Better Auth component for auth tables

## Current Authentication Flow

### 1. Better Auth Session Management
- **Session Storage**: Better Auth stores sessions in Convex `session` table
- **User Storage**: Better Auth stores users in Convex `user` table  
- **Session Token**: `__Secure-better-auth.session_token` cookie
- **Session Duration**: 7 days with 1-day update age

### 2. Convex Integration
- **Auth Component**: `authComponent` from `@convex-dev/better-auth`
- **Session Retrieval**: `authComponent.safeGetAuthUser(ctx)` in mutations/queries
- **Database Schema**: Better Auth tables in root schema for accessibility

## Current Issues

### Issue 1: Session Not Passed to Convex Functions

**Symptoms:**
```
Oct 25, 17:11:30.477 M tasks:addTask
Uncaught Error: Not authenticated at handler (../convex/tasks.ts:53:23)
```

**Root Cause:**
The Better Auth session is successfully created and stored in the database, but it's not being passed to Convex functions. The `authComponent.safeGetAuthUser(ctx)` returns `null` even though the session exists.

**Evidence from Logs:**
- ✅ Session creation successful: `adapter:create` shows session created
- ✅ Session retrieval successful: `GET /api/auth/get-session` returns user data
- ❌ Convex functions fail: `authComponent.safeGetAuthUser(ctx)` returns `null`

### Issue 2: Session-Context Disconnect

**The Problem:**
Better Auth sessions are working correctly on the client side (magic link authentication works), but the session context is not being passed to Convex server functions.

**Technical Details:**
- **Client Side**: `authClient.useSession()` returns valid session data
- **Server Side**: `authComponent.safeGetAuthUser(ctx)` returns `null`
- **Session Token**: Present in cookies but not accessible to Convex functions

### Issue 3: Monorepo Architecture Complexity

**Challenges:**
1. **Multiple Apps, Single Backend**: 5 frontend apps sharing one Convex deployment
2. **Session Sharing**: Better Auth sessions need to work across all apps
3. **Component Isolation**: Better Auth component tables need to be accessible to main app
4. **Environment Variables**: Different URLs for different apps but shared backend

## Technical Analysis

### Session Flow Breakdown

```mermaid
graph TD
    A[User clicks magic link] --> B[Better Auth verifies token]
    B --> C[Session created in Convex]
    C --> D[Session cookie set]
    D --> E[User redirected to app]
    E --> F[Client: authClient.useSession() works]
    F --> G[Server: authComponent.safeGetAuthUser() fails]
    G --> H[Convex functions throw 'Not authenticated']
```

### Database Schema Issues

**Current Schema Structure:**
```typescript
// Root schema (convex/schema.ts)
export default defineSchema({
  // Better Auth tables (accessible to main app)
  user: defineTable({...}),
  session: defineTable({...}),
  account: defineTable({...}),
  verification: defineTable({...}),
  
  // App tables (reference Better Auth users)
  tasks: defineTable({
    userId: v.string(), // References Better Auth user._id
    ...
  }),
  notes: defineTable({
    userId: v.string(), // References Better Auth user._id
    ...
  }),
  subscriptions: defineTable({
    userId: v.string(), // References Better Auth user._id
    ...
  })
});
```

**The Problem:**
- Better Auth tables are in root schema but isolated
- App tables reference Better Auth users via `userId: v.string()`
- Session context is not properly passed from Better Auth to Convex functions

### Environment Configuration

**Current Setup:**
```bash
# Convex Environment
TODO_SITE_URL=https://tasks.caalm.app
TRACKER_SITE_URL=https://tracker.caalm.app
TIMER_SITE_URL=https://timer.caalm.app

# Vercel Environment (per app)
NEXT_PUBLIC_CONVEX_URL=https://next-herring-619.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://next-herring-619.convex.site
NEXT_PUBLIC_APP_URL=https://tasks.caalm.app
```

## Error Patterns

### Pattern 1: Session Creation Success, Function Failure
```
✅ Session created: adapter:create
✅ Session retrieved: GET /api/auth/get-session  
❌ Convex function fails: Not authenticated
```

### Pattern 2: Client-Server Disconnect
```
✅ Client: authClient.useSession() returns user
❌ Server: authComponent.safeGetAuthUser(ctx) returns null
```

### Pattern 3: Migration Failures
```
✅ User logs in successfully
✅ Session exists in database
❌ localStorage migration fails: "Not authenticated"
❌ Task creation fails: "Not authenticated"
```

## Root Cause Analysis

### Primary Issue: Session Context Not Passed to Convex

The core problem is that Better Auth sessions are not being properly passed to Convex functions. This could be due to:

1. **Missing Session Middleware**: Convex functions don't have access to the session context
2. **Component Isolation**: Better Auth component may not be properly integrated with main app
3. **Cookie Handling**: Session cookies may not be passed to Convex functions
4. **Context Provider**: Missing or incorrect session context provider

### Secondary Issues

1. **Monorepo Complexity**: Multiple apps sharing one backend creates session management challenges
2. **Environment Variables**: Different URLs for different apps but shared authentication
3. **Schema Design**: Better Auth tables in root schema but app tables referencing them

## Proposed Solutions

### Solution 1: Fix Session Context Passing

**Approach**: Ensure Better Auth sessions are properly passed to Convex functions

**Implementation**:
1. Verify `authComponent.safeGetAuthUser(ctx)` is receiving session context
2. Check if session cookies are being passed to Convex functions
3. Ensure proper integration between Better Auth and Convex

### Solution 2: Simplify Architecture

**Approach**: Use a single authentication flow for all apps

**Implementation**:
1. Centralize authentication in the main Convex app
2. Use shared session management across all apps
3. Simplify environment variable configuration

### Solution 3: Component Integration

**Approach**: Properly integrate Better Auth component with main app

**Implementation**:
1. Ensure Better Auth component is properly configured
2. Verify session context is passed to all Convex functions
3. Test authentication flow end-to-end

## Next Steps

1. **Debug Session Context**: Add logging to understand why `authComponent.safeGetAuthUser(ctx)` fails
2. **Verify Cookie Passing**: Ensure session cookies are passed to Convex functions
3. **Test Authentication Flow**: Verify complete authentication flow works
4. **Fix Task Creation**: Ensure tasks can be created after authentication
5. **Test Migration**: Ensure localStorage migration works after authentication

## Current Status

- ✅ Better Auth authentication works (magic link)
- ✅ Session creation and storage works
- ✅ Client-side session retrieval works
- ❌ Server-side session context fails
- ❌ Convex functions throw "Not authenticated"
- ❌ Task creation fails
- ❌ localStorage migration fails

## Impact

- **User Experience**: Users can log in but cannot create or manage tasks
- **Data Migration**: Local tasks cannot be migrated to Convex
- **App Functionality**: Core CRUD operations fail
- **Multi-App Support**: Authentication issues affect all apps in the monorepo

---

*Last Updated: October 25, 2025*
*Status: Critical - Authentication not working for Convex functions*

