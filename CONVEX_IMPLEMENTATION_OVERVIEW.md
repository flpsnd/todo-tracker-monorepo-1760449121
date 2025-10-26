# Convex Backend Implementation Overview

## Project Structure & Current State

This document provides a comprehensive overview of the current state of our centralized Convex backend implementation for a multi-app monorepo architecture.

### Architecture Overview

We have a **centralized Convex backend** located in `/convex` that serves **5 micro-applications** hosted separately on Vercel:

- **Hub App** (`caalm.app`) - Main landing page and app launcher
- **Todo App** (`todo.caalm.app`) - Task management application  
- **Tracker App** (`tracker.caalm.app`) - Subscription/habit tracking
- **Notes App** (`notes.caalm.app`) - Note-taking application
- **IDE Board App** (`ide-board.caalm.app`) - Sticky notes board
- **Timer App** (`timer.caalm.app`) - Pomodoro timer application

### Current Backend State

#### ✅ What's Already Implemented

**1. Database Schema (`convex/schema.ts`)**
```typescript
// Core application tables
- tasks: Todo items with user association
- subscriptions: Habit tracking data by month
- notes: Sticky notes with positioning data
- leadsEmail: Newsletter signup tracking

// BetterAuth tables (integrated)
- user: User accounts with email verification
- session: User sessions with token management
- account: OAuth provider accounts
- verification: Email verification tokens
```

**2. Authentication System (`convex/auth.ts`)**
- **BetterAuth integration** with `@convex-dev/better-auth`
- **Magic link authentication only** (email/password disabled)
- **Session management** (7-day expiry, 1-day update age)
- **Email sending** via Resend integration
- **Multi-domain support** configured for all app subdomains

**3. API Functions**
- **Tasks API** (`convex/tasks.ts`): CRUD operations for todo items
- **Notes API** (`convex/notes.ts`): CRUD operations for sticky notes
- **Subscriptions API** (`convex/subscriptions.ts`): Habit tracking by month
- **Email Leads API** (`convex/leadsEmail.ts`): Newsletter signup management
- **Email Service** (`convex/email.ts`): Magic link and verification emails

**4. HTTP Routes (`convex/http.ts`)**
- BetterAuth routes registered for authentication callbacks
- Multi-domain CORS configuration in `auth.config.ts`

#### ✅ What's Been Cleaned Up

**Frontend Apps Decoupled:**
- Removed all individual `convex-provider.tsx` files
- Removed all `auth-client.ts` files  
- Removed all `/api/auth/[...all]/route.ts` files
- Cleaned up `package.json` dependencies (removed `convex`, `@convex-dev/better-auth`, `better-auth`, `resend`)
- Removed individual `convex.json` configurations

### Current Configuration

#### Environment Variables Required
```bash
# Convex
CONVEX_DEPLOYMENT=your-deployment-url
CONVEX_SITE_URL=https://caalm.app

# App-specific URLs
TODO_SITE_URL=https://todo.caalm.app
TRACKER_SITE_URL=https://tracker.caalm.app
NOTES_SITE_URL=https://notes.caalm.app
IDE_BOARD_SITE_URL=https://ide-board.caalm.app
TIMER_SITE_URL=https://timer.caalm.app

# Email Service (Resend)
RESEND_API_KEY=your-resend-key
RESEND_DOMAIN=your-verified-domain

# BetterAuth
BETTER_AUTH_SECRET=your-secret-key
```

#### Package Dependencies
```json
{
  "dependencies": {
    "convex": "^1.27.5",
    "@convex-dev/better-auth": "^0.9.5",
    "better-auth": "^1.3.27",
    "resend": "^6.1.2"
  }
}
```

### Implementation Challenges & Next Steps

#### 🔴 Critical Issues to Address

**1. Frontend Integration**
- **No Convex providers** in any frontend apps
- **No authentication setup** in frontend components
- **No API calls** to Convex backend
- **Missing environment variables** in frontend apps

**2. Authentication Flow**
- Need to implement **shared auth provider** for all apps
- Need to handle **cross-domain authentication** (main domain ↔ subdomains)
- Need to implement **auth state management** across apps
- Need to handle **session persistence** across subdomains

**3. API Integration**
- Need to **reconnect all frontend apps** to centralized backend
- Need to implement **proper error handling** for auth failures
- Need to handle **offline/online sync** for each app
- Need to implement **loading states** and **optimistic updates**

#### 🟡 Technical Considerations

**1. Cross-Domain Authentication**
- BetterAuth needs to handle **cookie sharing** across subdomains
- Need to configure **CORS policies** for all domains
- Need to handle **redirect flows** after authentication

**2. Data Synchronization**
- Each app has **different data requirements**
- Need to implement **efficient data fetching** strategies
- Need to handle **real-time updates** across apps
- Need to implement **conflict resolution** for offline sync

**3. Performance & Scalability**
- Need to implement **query optimization** for each app
- Need to handle **large datasets** (especially for tracker app)
- Need to implement **caching strategies**
- Need to handle **rate limiting** and **abuse prevention**

### Recommended Implementation Plan

#### Phase 1: Core Infrastructure
1. **Set up shared Convex provider** component
2. **Implement authentication wrapper** for all apps
3. **Configure environment variables** for all deployments
4. **Test basic authentication flow** across domains

#### Phase 2: App Integration
1. **Reconnect Todo app** (highest priority - most complex)
2. **Reconnect Tracker app** (subscription data)
3. **Reconnect Notes/IDE Board apps** (simpler data models)
4. **Reconnect Timer app** (minimal data requirements)

#### Phase 3: Optimization
1. **Implement real-time updates** where needed
2. **Add offline sync capabilities**
3. **Optimize query performance**
4. **Add comprehensive error handling**

### Key Files to Focus On

**Backend Files:**
- `convex/schema.ts` - Database schema
- `convex/auth.ts` - Authentication configuration
- `convex/auth.config.ts` - Multi-domain setup
- `convex/http.ts` - API routes

**Frontend Integration Points:**
- Need to create shared `ConvexProvider` component
- Need to create shared `AuthProvider` component  
- Need to update each app's `layout.tsx` to include providers
- Need to implement auth state management in each app

### Questions for Consultant

1. **Cross-domain authentication**: What's the best approach for handling authentication across multiple subdomains with BetterAuth?

2. **Session management**: How should we handle session persistence and sharing across the main domain and subdomains?

3. **Data architecture**: Are there any optimizations we should make to the current schema for better performance across multiple apps?

4. **Error handling**: What's the recommended pattern for handling authentication failures and API errors across multiple frontend apps?

5. **Deployment strategy**: What's the best approach for deploying and managing environment variables across multiple Vercel deployments?

6. **Real-time updates**: Which apps would benefit most from real-time updates, and how should we implement them efficiently?

### Current Status: Ready for Implementation

The backend is **fully functional** and ready to serve all applications. The main work now is **frontend integration** - reconnecting each app to the centralized backend with proper authentication and data management.

All Convex functions are implemented, tested, and ready to use. The authentication system is configured for multi-domain usage. The database schema supports all required functionality for each application.

**Next immediate step**: Create shared provider components and begin reconnecting the Todo app as the primary test case.
