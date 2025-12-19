/**
 * Server action to send welcome email after registration
 */

'use server';

import { sendEmail } from '@/lib/email/service';
import { getWelcomeEmailTemplate } from '@/lib/email/templates';

export async function sendWelcomeEmail(
  email: string,
  parentName: string,
  familyCode: string
) {
  try {
    const emailTemplate = getWelcomeEmailTemplate(parentName, familyCode);

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return {
      success: false,
      error: 'Failed to send welcome email',
    };
  }
}

export async function sendSubscriptionUpgradeEmail(
  email: string,
  parentName: string,
  planName: string
) {
  try {
    const { getSubscriptionUpgradeEmailTemplate } = await import(
      '@/lib/email/templates'
    );
    const emailTemplate = getSubscriptionUpgradeEmailTemplate(
      parentName,
      planName
    );

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending upgrade email:', error);
    return {
      success: false,
      error: 'Failed to send upgrade email',
    };
  }
}

export async function sendTaskCompletionEmail(
  email: string,
  parentName: string,
  childName: string,
  taskName: string,
  starsEarned: number
) {
  try {
    const { getTaskCompletionEmailTemplate } = await import(
      '@/lib/email/templates'
    );
    const emailTemplate = getTaskCompletionEmailTemplate(
      parentName,
      childName,
      taskName,
      starsEarned
    );

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending task completion email:', error);
    return {
      success: false,
      error: 'Failed to send task completion email',
    };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  parentName: string,
  resetLink: string
) {
  try {
    const { getPasswordResetEmailTemplate } = await import(
      '@/lib/email/templates'
    );
    const emailTemplate = getPasswordResetEmailTemplate(
      parentName,
      resetLink
    );

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: 'Failed to send password reset email',
    };
  }
}

export async function sendRewardRequestEmail(
  email: string,
  parentName: string,
  childName: string,
  rewardName: string,
  starCost: number,
  isAutoApproved: boolean
) {
  try {
    const { getRewardRequestEmailTemplate } = await import(
      '@/lib/email/templates'
    );
    const emailTemplate = getRewardRequestEmailTemplate(
      parentName,
      childName,
      rewardName,
      starCost,
      isAutoApproved
    );

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending reward request email:', error);
    return {
      success: false,
      error: 'Failed to send reward request email',
    };
  }
}

export async function sendCustomRewardRequestEmail(
  email: string,
  parentName: string,
  childName: string,
  rewardName: string,
  notes?: string
) {
  try {
    const { getCustomRewardRequestEmailTemplate } = await import(
      '@/lib/email/templates'
    );
    const emailTemplate = getCustomRewardRequestEmailTemplate(
      parentName,
      childName,
      rewardName,
      notes
    );

    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return result;
  } catch (error) {
    console.error('Error sending custom reward request email:', error);
    return {
      success: false,
      error: 'Failed to send custom reward request email',
    };
  }
}
