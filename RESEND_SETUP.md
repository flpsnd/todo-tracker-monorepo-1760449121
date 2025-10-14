# Resend Email Setup Guide

## Overview
The authentication system now properly integrates with Resend for sending magic link emails. This guide will help you set up Resend to send actual emails instead of just logging to console.

## Setup Steps

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key
1. In the Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Give it a name like "Todo App Production"
4. Copy the API key (starts with `re_`)

### 3. Add Your Domain
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `sanda.sk`)
4. Follow the DNS setup instructions to verify domain ownership
5. Wait for domain verification (can take a few minutes)

### 4. Set Environment Variables

#### For Convex (Production)
```bash
npx convex env set RESEND_API_KEY re_your_api_key_here
npx convex env set RESEND_DOMAIN sanda.sk
```

#### For Local Development
Create a `.env.local` file:
```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_DOMAIN=sanda.sk
```

### 5. Deploy the Changes
```bash
npx convex deploy
```

## How It Works Now

### Email Sending Logic
1. **If Resend is configured** (API key + domain set):
   - Sends beautiful HTML emails via Resend
   - Logs success to console
   - Falls back to console log if Resend fails

2. **If Resend is not configured**:
   - Logs magic link to console (development mode)
   - Shows helpful message about setting up Resend

### Email Templates
- **Magic Link**: Professional sign-in email with branded button
- **OTP**: Clean verification code display
- **Email Verification**: Email confirmation with green button
- **Password Reset**: Security-focused reset email with red button

## Testing

### 1. Test Email Sending
1. Try signing in with your email
2. Check the Convex logs for: `📧 Magic link email sent to [email] via Resend`
3. Check your email inbox for the magic link
4. Check Resend dashboard for delivery status

### 2. Verify in Resend Dashboard
1. Go to "Logs" in Resend dashboard
2. You should see your email being sent
3. Check delivery status and any errors

## Troubleshooting

### Common Issues

#### "Failed to send magic link email"
- Check that `RESEND_API_KEY` is set correctly
- Verify the API key is valid and active
- Check that `RESEND_DOMAIN` matches your verified domain

#### "Domain not verified"
- Go to Resend dashboard → Domains
- Check DNS records are set correctly
- Wait for verification (can take up to 24 hours)

#### "API key invalid"
- Generate a new API key in Resend dashboard
- Update the environment variable
- Redeploy: `npx convex deploy`

### Debug Steps
1. Check Convex logs for error messages
2. Verify environment variables are set: `npx convex env ls`
3. Test with a simple email first
4. Check Resend dashboard for delivery attempts

## Production Checklist

- [ ] Resend account created
- [ ] API key generated and set
- [ ] Domain added and verified
- [ ] Environment variables set in Convex
- [ ] App deployed with new email code
- [ ] Test email sent successfully
- [ ] Magic link works end-to-end

## Cost Information

- **Resend Free Tier**: 3,000 emails/month
- **Resend Pro**: $20/month for 50,000 emails
- **Perfect for small apps**: Free tier should be sufficient for most todo apps

## Security Notes

- Never commit API keys to git
- Use environment variables for all secrets
- Rotate API keys regularly
- Monitor email sending in Resend dashboard
