# Vercel Deployment Guide

## Overview

This Next.js application is configured to deploy on Vercel with Firebase backend and email functionality.

## Prerequisites

1. A Vercel account (free tier available at https://vercel.com)
2. A GitHub repository with this code
3. Firebase credentials (already configured in `.env.local`)
4. SMTP credentials for email functionality

## Setup Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select "Next.js" as the framework
4. Click "Deploy"

### 3. Configure Environment Variables in Vercel

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

#### Firebase Configuration (Public)

- `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaSyCisfeZ1QPXI0gdrkfvEYwDYxqPyVnALrQ`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `reward-f4a41.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `reward-f4a41`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `reward-f4a41.firebasestorage.app`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `744191183124`
- `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:744191183124:web:b398727c40f92829471a01`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` = `G-XME0DYK7YK`

#### App Configuration (Public)

- `NEXT_PUBLIC_APP_URL` = `https://your-domain.vercel.app` (or your custom domain)

#### Email Configuration (Private)

- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_USER` = `your-email@gmail.com`
- `SMTP_PASSWORD` = `your-app-specific-password`
- `SMTP_FROM_EMAIL` = `noreply@familyrewards.com`
- `SMTP_SECURE` = `false`

**Note:** For Gmail, you need to:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the App Password as `SMTP_PASSWORD`

### 4. Update Firebase Security Rules (Optional)

If using Firestore, ensure your `firestore.rules` allow requests from your Vercel domain:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings > Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable with your custom domain

## Files for Vercel Deployment

### vercel.json

- Specifies build command and output directory
- Configures environment variables
- Sets cache headers for PWA files
- Node version: 20.x

### .vercelignore

- Excludes unnecessary files from deployment
- Reduces deployment size and improves build speed

### next.config.ts

- Optimized for Vercel production environment
- Enables SWC minification
- Configures static page generation timeout
- Sets up image optimization

## Build & Deployment Process

1. **Local Development:**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Production Build (Local):**

   ```bash
   npm run build
   npm start
   # or
   pnpm build
   pnpm start
   ```

3. **Automatic Deployment:**
   - Every push to the main branch triggers a new deployment
   - Vercel automatically runs `next build` and deploys
   - Previous deployments are preserved and can be rolled back

## Common Issues & Fixes

### Build Fails Due to Firebase

- Ensure all Firebase environment variables are set
- Firebase initialization handles missing variables gracefully during server-side rendering

### Email Not Sending

- Verify SMTP credentials are correct
- Check Gmail App Password (not regular password)
- Ensure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are configured
- Check email validation regex in `/src/app/api/email/send/route.ts`

### PWA Not Working

- Service Worker (`/public/sw.js`) is configured with proper cache headers
- Ensure `NEXT_PUBLIC_APP_URL` matches your deployment URL

### CORS Issues

- Firebase is configured to allow requests from any origin
- API routes are accessible from the frontend

## Performance Optimization

The configuration includes:

- **SWC Minification**: Faster builds and smaller bundle sizes
- **Image Optimization**: Automatic image optimization for better performance
- **Static Generation**: Pages are pre-built when possible
- **Dynamic Rendering**: Firebase-dependent pages use dynamic rendering

## Monitoring

In Vercel dashboard:

- **Analytics**: View performance metrics
- **Monitoring**: Check build logs and deployment status
- **Performance**: Monitor Core Web Vitals

## Rollback

If a deployment causes issues:

1. Go to your Vercel project dashboard
2. Click on **Deployments**
3. Find the previous working deployment
4. Click the three dots and select **Promote to Production**

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Firebase Documentation: https://firebase.google.com/docs
- Nodemailer Documentation: https://nodemailer.com/
