/**
 * Email Service Configuration
 * Manages SMTP connection and email sending
 */

import nodemailer from 'nodemailer';

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter with SMTP settings from environment
 */
function initializeTransporter() {
  if (transporter) {
    return transporter;
  }

  // Get SMTP configuration from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@familyrewards.com';

  // Validate required environment variables
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn(
      'Email service not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Send an email
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const mailTransporter = initializeTransporter();

    if (!mailTransporter) {
      console.error('Email service not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@familyrewards.com';

    const result = await mailTransporter.sendMail({
      from: smtpFromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    console.log('Email sent successfully:', result.messageId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to send email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify email service connection
 */
export async function verifyEmailService(): Promise<boolean> {
  try {
    const mailTransporter = initializeTransporter();

    if (!mailTransporter) {
      return false;
    }

    await mailTransporter.verify();
    console.log('Email service verified successfully');
    return true;
  } catch (error) {
    console.error('Email service verification failed:', error);
    return false;
  }
}
