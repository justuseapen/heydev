/**
 * Email Service
 * Handles sending emails (magic link, verification, etc.)
 *
 * For now, this logs emails to console. In production, integrate with
 * Resend, SendGrid, or another email service provider.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 * In development, logs to console. In production, uses configured provider.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text } = options;

  // Check for email provider configuration
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    // Use Resend API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'HeyDev <noreply@heydev.io>',
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[EmailService] Resend API error:', error);
        return { success: false, error: 'Failed to send email' };
      }

      return { success: true };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  // Development mode - log email to console
  console.log('\n========================================');
  console.log('[EmailService] Simulated Email Send');
  console.log('========================================');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('----------------------------------------');
  console.log(text || html);
  console.log('========================================\n');

  return { success: true };
}

/**
 * Send a magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">HeyDev</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #111827; margin-top: 0;">Sign in to your account</h2>
    <p style="color: #6b7280;">Click the button below to sign in to HeyDev. This link will expire in 15 minutes.</p>
    <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0;">Sign In</a>
    <p style="color: #9ca3af; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">Or copy and paste this URL into your browser:</p>
    <p style="color: #6366f1; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
  </div>
</body>
</html>
`;

  const text = `
Sign in to HeyDev

Click the link below to sign in to your HeyDev account. This link will expire in 15 minutes.

${verifyUrl}

If you didn't request this email, you can safely ignore it.
`;

  return sendEmail({
    to: email,
    subject: 'Sign in to HeyDev',
    html,
    text,
  });
}
