# Production Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Convex Configuration
# Run `npx convex dev` to get these values
CONVEX_DEPLOYMENT=dev:your-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-id.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment-id.convex.site

# Better Auth Configuration
# Generate a random secret: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-key-here
SITE_URL=http://localhost:3000

# Optional: For production email sending
# RESEND_API_KEY=your-resend-api-key
```

## Setup Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Initialize Convex:**
   ```bash
   npx convex dev
   ```
   This will create the necessary Convex configuration and provide you with the deployment URLs.

3. **Set up environment variables:**
   - Copy the Convex URLs from the previous step to your `.env.local`
   - Generate a secret for Better Auth:
     ```bash
     openssl rand -base64 32
     ```

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

## Features

- **Local-first**: App works offline with localStorage
- **Optional sync**: Sign in to sync across devices
- **Email authentication**: Magic link authentication via Better Auth
- **Real-time sync**: When signed in, changes sync to Convex
- **Drag & drop**: All existing functionality preserved

## Usage

1. **Local usage**: The app works immediately without signing in
2. **Sign in**: Click "Sign in to sync" to authenticate with email
3. **Sync**: When signed in, all changes are saved both locally and to Convex
4. **Sign out**: App continues working with local storage only

## Production Deployment

1. Deploy to Vercel or your preferred platform
2. Set up Convex production deployment
3. Configure email sending (Resend recommended)
4. Update environment variables with production URLs
