# Authentication Setup Guide

## Overview
This todo app now uses Better Auth with Convex for magic link authentication. Users can sign in by entering their email address and clicking a magic link sent to their inbox.

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here
NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url_here

# Better Auth Configuration
SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=your_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (Optional - for production)
RESEND_API_KEY=your_resend_api_key_here
RESEND_DOMAIN=your_domain_here
```

## Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```

3. **Configure Environment Variables**
   - Copy the Convex URL from the Convex dashboard
   - Generate a random secret for `BETTER_AUTH_SECRET`
   - Set `SITE_URL` to your app URL

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

## How It Works

### Magic Link Authentication
1. User enters their email address in the auth form
2. A magic link is sent to their email (logged to console in development)
3. User clicks the link to sign in
4. User is automatically signed in and their tasks sync with Convex

### Local-First Architecture
- Tasks are stored locally in the browser's localStorage
- When a user signs in, local tasks are synced with Convex
- Tasks continue to work offline even when signed in
- Changes are synced when the user is online

### Development vs Production
- **Development**: Magic links are logged to the console
- **Production**: Set up Resend or another email service for actual email delivery

## File Structure

```
convex/
├── auth.ts                 # Better Auth configuration
├── betterAuth/
│   ├── schema.ts          # Auth database schema
│   └── convex.config.ts   # Better Auth Convex config
├── email.ts               # Email sending functions
├── http.ts                # HTTP routes for auth
└── tasks.ts               # Task management functions

lib/
├── auth-client.ts         # Client-side auth configuration
└── convex-provider.tsx    # Convex + Better Auth provider

components/
└── auth-button.tsx        # Sign in/out UI component
```

## Testing the Setup

1. Start the development server: `npm run dev`
2. Open the app in your browser
3. Try signing in with an email address
4. Check the console for the magic link
5. Click the magic link to complete authentication
6. Verify that tasks sync between local storage and Convex

## Troubleshooting

- **Build errors**: Make sure all dependencies are installed
- **Auth not working**: Check that environment variables are set correctly
- **Magic links not working**: Verify the SITE_URL matches your app URL
- **Tasks not syncing**: Check that Convex is running and connected
