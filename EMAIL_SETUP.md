# Email Service Setup Guide

## Overview

The Family Rewards app now includes a complete email service using **Nodemailer** with SMTP support for sending transactional emails.

## Features

- ✅ **Welcome emails** for new parent registrations
- ✅ **Subscription upgrade confirmations** when parents upgrade plans
- ✅ **Task completion notifications** when children complete tasks
- ✅ **Password reset emails** with secure reset links
- ✅ **Server-side only execution** (no client-side bundling issues)
- ✅ **Beautiful HTML email templates** with responsive design

## Architecture

### File Structure

```
src/lib/email/
├── service.ts          # Core email sending service (server-only)
├── templates.ts        # Reusable email HTML/text templates
└── actions.ts          # Server actions for sending emails from client components
```

### API Route

```
src/app/api/email/send/
└── route.ts            # POST endpoint for sending emails
```

## Configuration

### Environment Variables

Add these to your `.env.local` file (see `.env.example` for template):

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@familyrewards.com
SMTP_SECURE=false

# Public App URL (for links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Gmail Setup (Recommended)

1. Enable 2-factor authentication on your Google account
2. Create an App Password:
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Copy the generated 16-character password
3. Use the generated password as `SMTP_PASSWORD`

### Other Email Providers

**Gmail:**

- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false` (use TLS)

**Outlook/Microsoft 365:**

- Host: `smtp.office365.com`
- Port: `587`
- Secure: `false`

**SendGrid:**

- Host: `smtp.sendgrid.net`
- Port: `587` or `465`
- User: `apikey`
- Password: Your SendGrid API key

**AWS SES:**

- Host: `email-smtp.[region].amazonaws.com`
- Port: `587`
- Secure: `false`

## Usage

### 1. Send Welcome Email (After Registration)

```typescript
import { sendWelcomeEmail } from "@/lib/email/actions";

// In your registration handler (server action or API route)
const familyCode = "ABC123"; // First 6 characters of family ID
await sendWelcomeEmail(parentEmail, parentName, familyCode);
```

### 2. Send Subscription Upgrade Email

```typescript
import { sendSubscriptionUpgradeEmail } from "@/lib/email/actions";

await sendSubscriptionUpgradeEmail(parentEmail, parentName, "Premium Plan");
```

### 3. Send Task Completion Notification

```typescript
import { sendTaskCompletionEmail } from "@/lib/email/actions";

await sendTaskCompletionEmail(
  parentEmail,
  parentName,
  childName,
  taskName,
  starsEarned
);
```

### 4. Send Password Reset Email

```typescript
import { sendPasswordResetEmail } from "@/lib/email/actions";

const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
await sendPasswordResetEmail(parentEmail, parentName, resetLink);
```

### 5. Send Custom Email via API

```typescript
const response = await fetch("/api/email/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "recipient@example.com",
    subject: "Email Subject",
    html: "<p>HTML content</p>",
    text: "Plain text fallback",
  }),
});

const result = await response.json();
if (!result.success) {
  console.error("Email send failed:", result.error);
}
```

## Email Templates

All templates support variables and include both HTML and plain text versions:

### 1. Welcome Email (`getWelcomeEmailTemplate`)

**Variables:**

- `parentName` - The parent's full name
- `familyCode` - Family code to share with children

**Features:**

- Welcome message with family code
- Quick start tips
- Link to dashboard

### 2. Subscription Upgrade Email (`getSubscriptionUpgradeEmailTemplate`)

**Variables:**

- `parentName` - The parent's full name
- `planName` - The upgraded plan name (e.g., "Premium Plan")

**Features:**

- Confirmation of upgrade
- List of new features
- Link to dashboard

### 3. Task Completion Email (`getTaskCompletionEmailTemplate`)

**Variables:**

- `parentName` - The parent's full name
- `childName` - The child's name
- `taskName` - The completed task name
- `starsEarned` - Number of stars earned

**Features:**

- Congratulatory message
- Task details
- Stars earned display

### 4. Password Reset Email (`getPasswordResetEmailTemplate`)

**Variables:**

- `parentName` - The parent's full name
- `resetLink` - Full URL for password reset

**Features:**

- Secure reset link
- Link expiration warning
- Security note
- Do not share warning

## Customizing Templates

To customize email templates, edit `src/lib/email/templates.ts`:

```typescript
export function getWelcomeEmailTemplate(
  parentName: string,
  familyCode: string
) {
  return {
    subject: "Your custom subject",
    html: `<p>Custom HTML content</p>`,
    text: `Custom plain text content`,
  };
}
```

## Testing Emails

### Local Development

1. **Use Mailtrap or Ethereal Email:**

   - Ethereal: Free, temporary email testing
   - Update SMTP_HOST, SMTP_USER, SMTP_PASSWORD in `.env.local`
   - No real emails sent

2. **Verify Service:**
   ```bash
   # Run in Node REPL to test connection
   import { verifyEmailService } from '@/lib/email/service';
   await verifyEmailService(); // Returns true if connection works
   ```

### Production

1. **Test before deployment:**

   ```bash
   pnpm build && pnpm start
   ```

2. **Monitor logs:**
   - Check email service logs for errors
   - Verify SMTP credentials are correct
   - Confirm firewall allows SMTP connections

## Troubleshooting

### Email Not Sending

1. **Verify SMTP credentials:**

   ```bash
   # Test in Node:
   import nodemailer from 'nodemailer';
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT),
     secure: process.env.SMTP_SECURE === 'true',
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASSWORD,
     },
   });
   await transporter.verify();
   ```

2. **Check environment variables:**

   - Restart dev server after changing `.env.local`
   - Verify all required variables are set

3. **Review logs:**
   - Check server console for error messages
   - Verify email addresses are valid
   - Check firewall/network settings

### Gmail "Less secure apps" Error

Gmail now requires App Passwords instead of account passwords. See **Gmail Setup** section above.

### Port Already in Use (SMTP)

This shouldn't occur - the SMTP service runs on the server, not locally. Ensure SMTP_PORT is correct for your provider.

## Best Practices

1. **Always use .env.local for sensitive credentials** - never commit to git
2. **Test email setup before production deployment**
3. **Include unsubscribe links** in marketing emails (not needed for transactional)
4. **Use HTML + plain text** versions for better compatibility
5. **Monitor email delivery** for failures or bounces
6. **Rate limit email sending** if needed (not implemented yet)
7. **Use server actions or API routes** - never import email service in client components

## Future Enhancements

- [ ] Email queue/retry system for failed sends
- [ ] Email templates in database for admin customization
- [ ] Unsubscribe management for digest emails
- [ ] Email analytics (open, click tracking)
- [ ] Notification preferences per user
- [ ] Template preview/test sending in admin panel
- [ ] Multi-language email templates

## Support

For issues with:

- **SMTP connection:** Check credentials and firewall settings
- **Email delivery:** Verify recipient addresses and spam filters
- **Templates:** Edit `src/lib/email/templates.ts`
- **API:** Check `src/app/api/email/send/route.ts`

---

**Last Updated:** 2024
**Version:** 1.0
