/**
 * Email Templates for Family Rewards
 */

/**
 * Welcome email for new parent accounts
 */
export function getWelcomeEmailTemplate(parentName: string, familyCode: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: 'Welcome to Family Rewards! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 32px;">⭐ Welcome to Family Rewards!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b; font-size: 16px;">Hello <strong>${parentName}</strong>,</p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Thank you for signing up! We're excited to help you manage your family's tasks and rewards.
          </p>
          
          <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">Your Family Code:</p>
            <p style="color: #4f46e5; font-size: 28px; font-family: monospace; font-weight: bold; margin: 0;">
              ${familyCode}
            </p>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">
              Share this with your children so they can log in
            </p>
          </div>
          
          <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #4338ca; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> Start by creating your first task to get your family engaged with the reward system.
            </p>
          </div>
          
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Here's what you can do:
          </p>
          <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Create tasks and set star rewards</li>
            <li>Add your children and customize their profiles</li>
            <li>Set up rewards they can redeem</li>
            <li>Track progress and celebrate achievements</li>
          </ul>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            If you have any questions, reply to this email or visit our support center.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Family Rewards!

Hello ${parentName},

Thank you for signing up! We're excited to help you manage your family's tasks and rewards.

Your Family Code: ${familyCode}
Share this with your children so they can log in.

Here's what you can do:
- Create tasks and set star rewards
- Add your children and customize their profiles
- Set up rewards they can redeem
- Track progress and celebrate achievements

Visit your dashboard to get started: ${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard

If you have any questions, reply to this email or visit our support center.`,
  };
}

/**
 * Subscription upgrade confirmation email
 */
export function getSubscriptionUpgradeEmailTemplate(
  parentName: string,
  planName: string
): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `🎉 Welcome to ${planName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Upgrade Successful!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b; font-size: 16px;">Hello <strong>${parentName}</strong>,</p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Your subscription has been upgraded to <strong>${planName}</strong>! 🌟
          </p>
          
          <div style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #10b981; margin-top: 0;">Now You Have Access To:</h3>
            <ul style="color: #475569; font-size: 14px; line-height: 2;">
              <li>✅ Unlimited children</li>
              <li>✅ Unlimited tasks per child</li>
              <li>✅ Recurring tasks</li>
              <li>✅ Achievement badges</li>
              <li>✅ Email notifications</li>
              <li>✅ Advanced analytics</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Explore Premium Features
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Thank you for supporting Family Rewards! Questions? Contact our support team.
          </p>
        </div>
      </div>
    `,
    text: `🎉 Upgrade Successful!

Hello ${parentName},

Your subscription has been upgraded to ${planName}! 🌟

Now You Have Access To:
✅ Unlimited children
✅ Unlimited tasks per child
✅ Recurring tasks
✅ Achievement badges
✅ Email notifications
✅ Advanced analytics

Explore premium features: ${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard

Thank you for supporting Family Rewards! Questions? Contact our support team.`,
  };
}

/**
 * Task completion notification email
 */
export function getTaskCompletionEmailTemplate(
  parentName: string,
  childName: string,
  taskName: string,
  starsEarned: number
): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `⭐ ${childName} completed "${taskName}"!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⭐ Task Completed!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b; font-size: 16px;">Hi ${parentName},</p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Great news! <strong>${childName}</strong> just completed a task:
          </p>
          
          <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #1e293b; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
              ${taskName}
            </p>
            <p style="color: #f59e0b; font-size: 24px; font-weight: bold; margin: 0;">
              +${starsEarned} ⭐ Stars Earned
            </p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard" 
               style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated notification from Family Rewards.
          </p>
        </div>
      </div>
    `,
    text: `⭐ Task Completed!

Hi ${parentName},

Great news! ${childName} just completed a task:

${taskName}
+${starsEarned} ⭐ Stars Earned

View dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://familyrewards.com'}/dashboard

This is an automated notification from Family Rewards.`,
  };
}

/**
 * Password reset email
 */
export function getPasswordResetEmailTemplate(
  parentName: string,
  resetLink: string
): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: 'Reset Your Family Rewards Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b; font-size: 16px;">Hello ${parentName},</p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            We received a request to reset your Family Rewards password. Click the button below to create a new password:
          </p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${resetLink}" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </p>
          
          <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 20px;">
            This link will expire in 24 hours.
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 13px;">
              <strong>Security Note:</strong> If you didn't request a password reset, ignore this email or contact support immediately.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Family Rewards Security • Do not share this link with anyone
          </p>
        </div>
      </div>
    `,
    text: `Password Reset Request

Hello ${parentName},

We received a request to reset your Family Rewards password. Copy and paste the link below into your browser to create a new password:

${resetLink}

This link will expire in 24 hours.

Security Note: If you didn't request a password reset, ignore this email or contact support immediately.

Family Rewards Security • Do not share this link with anyone`,
  };
}
