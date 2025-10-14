# Tracker App Deployment Guide

## Overview
This guide covers deploying the subscription tracker app to Vercel with shared Convex backend.

## Prerequisites
- Existing Convex deployment (shared with todo app)
- Vercel account
- GitHub repository connected

## Step 1: Convex Environment Variables

In your Convex dashboard, add these environment variables:

```
TODO_SITE_URL=https://your-todo-domain.vercel.app
TRACKER_SITE_URL=https://v0-customer-tracker-app.vercel.app
```

These allow authentication from both domains.

## Step 2: Vercel Deployment

### Connect Repository
1. Go to Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. **Important**: Set Root Directory to `apps/tracker`

### Build Configuration
- **Framework Preset**: Next.js
- **Root Directory**: `apps/tracker`
- **Build Command**: `pnpm build` (or `npm run build`)
- **Output Directory**: `.next`

### Environment Variables
Add these in Vercel project settings:

```
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment-url
NEXT_PUBLIC_APP_URL=https://v0-customer-tracker-app.vercel.app
SITE_URL=https://v0-customer-tracker-app.vercel.app
```

## Step 3: Build Configuration

### Vercel Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `apps/tracker`
- **Build Command**: `pnpm build` (or `npm run build`)
- **Output Directory**: `.next`

### Package Manager
If using pnpm, add `.npmrc` file in tracker directory:
```
shamefully-hoist=true
```

## Step 4: Domain Configuration

### Custom Domain (Optional)
1. In Vercel project settings
2. Go to "Domains"
3. Add your custom domain
4. Update Convex `TRACKER_SITE_URL` with new domain

## Step 5: Testing

### Verify Deployment
1. Visit your tracker app URL
2. Test authentication (should work with same account as todo app)
3. Test data sync (create subscriptions, check if they appear in todo app)

### Common Issues
- **Build fails**: Check if all dependencies are in `package.json`
- **Auth not working**: Verify Convex environment variables
- **Data not syncing**: Check if both apps use same Convex URL

## Step 6: Production Checklist

- [ ] Convex environment variables set
- [ ] Vercel environment variables set
- [ ] Both apps can authenticate
- [ ] Data syncs between apps
- [ ] Custom domains configured (if needed)
- [ ] Analytics working (if enabled)

## Environment Variables Reference

### Convex Dashboard
```
TODO_SITE_URL=https://your-todo-domain.vercel.app
TRACKER_SITE_URL=https://v0-customer-tracker-app.vercel.app
```

### Vercel (Tracker App)
```
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment-url
NEXT_PUBLIC_APP_URL=https://v0-customer-tracker-app.vercel.app
SITE_URL=https://v0-customer-tracker-app.vercel.app
```

### Vercel (Todo App) - Update if needed
```
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment-url
NEXT_PUBLIC_APP_URL=https://your-todo-domain.vercel.app
SITE_URL=https://your-todo-domain.vercel.app
```

## Troubleshooting

### Build Issues
- Ensure all dependencies are in `apps/tracker/package.json`
- Check if TypeScript compilation passes
- Verify import paths are correct

### Authentication Issues
- Verify Convex environment variables include both domains
- Check if `auth.config.ts` has both providers
- Ensure both apps use same Convex deployment

### Data Sync Issues
- Verify both apps use same `NEXT_PUBLIC_CONVEX_URL`
- Check if user is authenticated in both apps
- Verify Convex functions are deployed
