# Production Deployment Guide

## 🚀 Complete Step-by-Step Production Setup

### Phase 1: Convex Production Setup

#### 1. Initialize Convex Production
```bash
# Install Convex CLI globally if not already installed
npm install -g convex

# Login to Convex
npx convex login

# Create production deployment
npx convex deploy --prod
```

#### 2. Get Production URLs
After deployment, Convex will provide you with:
- `CONVEX_DEPLOYMENT` = `prod:next-herring-619`
- `NEXT_PUBLIC_CONVEX_URL` = `https://next-herring-619.convex.cloud`
- `NEXT_PUBLIC_CONVEX_SITE_URL` = `https://next-herring-619.convex.site`

#### 3. Set Environment Variables in Convex
```bash
# Set Better Auth secret
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)

# Set site URL for production
npx convex env set SITE_URL https://your-vercel-app.vercel.app
```

### Phase 2: Vercel Deployment

#### 1. Prepare for Vercel
```bash
# Make sure you're in the project directory
cd /Users/filipsanda/todo/v0-to-do-app-with-drag

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

#### 2. Create Production Environment File
Create `.env.production` with your Convex production values:
```bash
# Convex Production Configuration
CONVEX_DEPLOYMENT=prod:next-herring-619
NEXT_PUBLIC_CONVEX_URL=https://next-herring-619.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://next-herring-619.convex.site

# Better Auth Configuration
BETTER_AUTH_SECRET=your-generated-secret
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app

# Optional: For production email sending
RESEND_API_KEY=your-resend-api-key
```

#### 3. Deploy to Vercel
```bash
# Deploy to Vercel
vercel --prod

# Or use the Vercel dashboard at vercel.com
```

### Phase 3: Configure Production Settings

#### 1. Update Vercel Environment Variables
In your Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add these variables:
   - `CONVEX_DEPLOYMENT` = `prod:next-herring-619`
   - `NEXT_PUBLIC_CONVEX_URL` = `https://next-herring-619.convex.cloud`
   - `NEXT_PUBLIC_CONVEX_SITE_URL` = `https://next-herring-619.convex.site`
   - `BETTER_AUTH_SECRET` = `your-generated-secret`
   - `NEXT_PUBLIC_APP_URL` = `https://your-vercel-app.vercel.app`

#### 2. Update Convex Site URL
```bash
# Update the site URL in Convex to match your Vercel domain
npx convex env set SITE_URL https://your-vercel-app.vercel.app
```

### Phase 4: Test Production Setup

#### 1. Test Local-First Functionality
- Visit your Vercel app
- Create tasks without signing in
- Verify tasks persist in localStorage
- Refresh page - tasks should still be there

#### 2. Test Authentication
- Click "Sign in to sync"
- Enter your email
- Check console for magic link (since no email service configured yet)
- Copy the magic link from console and open it

#### 3. Test Sync Functionality
- After signing in, verify sync status shows "Synced"
- Create new tasks - they should sync to Convex
- Sign out and sign back in - tasks should persist

### Phase 5: Optional Email Configuration

#### 1. Set up Resend for Production Emails
```bash
# Get API key from resend.com
# Add to Vercel environment variables:
RESEND_API_KEY=re_your_api_key_here
```

#### 2. Update Better Auth Configuration
Update `convex/auth.ts` to use Resend:
```typescript
sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
  if (process.env.RESEND_API_KEY) {
    // Use Resend for production
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Sign in to your Todo App',
      html: `<a href="${url}">Click here to sign in</a>`,
    });
  } else {
    // Console log for development
    console.log(`Magic link for ${email}: ${url}`);
  }
},
```

### Phase 6: Final Production Checklist

#### ✅ Pre-Launch Checklist
- [ ] Convex production deployment working
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Local-first functionality working
- [ ] Authentication flow working
- [ ] Sync functionality working
- [ ] Email sending configured (optional)
- [ ] Custom domain configured (optional)

#### ✅ Post-Launch Monitoring
- [ ] Monitor Convex dashboard for errors
- [ ] Check Vercel analytics
- [ ] Test on different devices
- [ ] Verify sync across devices

### 🎯 Production URLs Structure

```
Frontend: https://your-app.vercel.app
Convex: https://your-deployment.convex.cloud
Auth: https://your-app.vercel.app/api/auth/[...all]
```

### 🔧 Troubleshooting

#### Common Issues:
1. **CORS errors**: Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel domain
2. **Auth not working**: Check `SITE_URL` in Convex matches your domain
3. **Sync not working**: Verify Convex environment variables in Vercel
4. **Magic links not working**: Check email configuration

#### Debug Commands:
```bash
# Check Convex deployment status
npx convex status

# View Convex logs
npx convex logs

# Check Vercel deployment logs
vercel logs
```

### 🚀 Quick Start Commands

```bash
# 1. Deploy Convex
npx convex deploy --prod

# 2. Deploy Vercel
vercel --prod

# 3. Set environment variables
npx convex env set SITE_URL https://your-app.vercel.app

# 4. Test the app
open https://your-app.vercel.app
```

Your production app will be live and ready for users! 🎉
