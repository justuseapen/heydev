/**
 * Email Notification Sender
 * Sends feedback notifications to configured email addresses
 */

import {
  registerChannelSender,
  type ChannelResult,
  type FeedbackData,
  type FeedbackContext,
} from './channelRouter.js';
import type { Channel } from '../db/index.js';
import { sendEmail } from './emailService.js';

/**
 * Email channel configuration stored in channel.config
 */
export interface EmailConfig {
  email: string;
  verified?: boolean;
}

/**
 * Format console errors for display in the email
 */
function formatConsoleErrors(errors?: { message: string; timestamp: string }[]): string {
  if (!errors || errors.length === 0) {
    return '<p style="color: #9ca3af; font-size: 14px;">No console errors captured</p>';
  }

  return `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 8px;">
      <p style="color: #dc2626; font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">Console Errors (${errors.length})</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${errors.map(err => `<li style="color: #7f1d1d; font-size: 13px; font-family: monospace; margin: 4px 0;">${escapeHtml(err.message)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Escape HTML special characters to prevent XSS in email content
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Extract the page path from a full URL for subject line
 */
function getPagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search || '/';
  } catch {
    return url;
  }
}

/**
 * Build the HTML email template for feedback notification
 */
function buildEmailHtml(
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): string {
  const screenshotSection = feedback.screenshot_url
    ? `
      <div style="margin: 16px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Screenshot:</p>
        <a href="${escapeHtml(feedback.screenshot_url)}" target="_blank" style="display: inline-block;">
          <img src="${escapeHtml(feedback.screenshot_url)}" alt="Screenshot" style="max-width: 100%; max-height: 300px; border: 1px solid #e5e7eb; border-radius: 8px;" />
        </a>
      </div>
    `
    : '';

  const audioSection = feedback.audio_url
    ? `
      <div style="margin: 16px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
          <a href="${escapeHtml(feedback.audio_url)}" target="_blank" style="color: #6366f1;">🎤 Listen to audio recording</a>
        </p>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">📬 New Feedback Received</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

    <!-- Feedback Content -->
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="color: #111827; font-size: 16px; margin: 0; white-space: pre-wrap;">${escapeHtml(feedback.text)}</p>
    </div>

    ${screenshotSection}
    ${audioSection}

    <!-- Context Information -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
      <h2 style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">Context</h2>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Page URL</td>
          <td style="padding: 8px 0; color: #111827;">
            <a href="${escapeHtml(context.url)}" target="_blank" style="color: #6366f1; text-decoration: none;">${escapeHtml(context.url)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Browser</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(context.browser)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">OS</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(context.os)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Viewport</td>
          <td style="padding: 8px 0; color: #111827;">${context.viewport.width} × ${context.viewport.height}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(context.timestamp)} (${escapeHtml(context.timezone)})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Session</td>
          <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 12px;">${escapeHtml(sessionId)}</td>
        </tr>
      </table>

      ${formatConsoleErrors(context.console_errors)}
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Sent via <a href="https://heydev.io" style="color: #6366f1; text-decoration: none;">HeyDev</a> - Frictionless feedback for developers
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Build plain text version of the email
 */
function buildEmailText(
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): string {
  let text = `
New Feedback Received
=====================

${feedback.text}

`;

  if (feedback.screenshot_url) {
    text += `Screenshot: ${feedback.screenshot_url}\n\n`;
  }

  if (feedback.audio_url) {
    text += `Audio recording: ${feedback.audio_url}\n\n`;
  }

  text += `
Context
-------
Page URL: ${context.url}
Browser: ${context.browser}
OS: ${context.os}
Viewport: ${context.viewport.width} × ${context.viewport.height}
Time: ${context.timestamp} (${context.timezone})
Session: ${sessionId}
`;

  if (context.console_errors && context.console_errors.length > 0) {
    text += `\nConsole Errors:\n`;
    for (const err of context.console_errors) {
      text += `- ${err.message}\n`;
    }
  }

  text += `
---
Sent via HeyDev - https://heydev.io
`;

  return text;
}

/**
 * Send feedback notification to an email address
 */
export async function sendEmailNotification(
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): Promise<ChannelResult> {
  const config = channel.config as EmailConfig | null;

  // Validate configuration
  if (!config?.email) {
    return {
      channelId: channel.id,
      channelType: 'email',
      success: false,
      error: 'Email address not configured',
    };
  }

  // Check if email is verified
  if (!config.verified) {
    return {
      channelId: channel.id,
      channelType: 'email',
      success: false,
      error: 'Email address not verified',
    };
  }

  // Build subject line with page path
  const pagePath = getPagePath(context.url);
  const subject = `New feedback from ${pagePath}`;

  // Build email content
  const html = buildEmailHtml(feedback, context, sessionId);
  const text = buildEmailText(feedback, context, sessionId);

  try {
    const result = await sendEmail({
      to: config.email,
      subject,
      html,
      text,
    });

    if (result.success) {
      return {
        channelId: channel.id,
        channelType: 'email',
        success: true,
      };
    }

    return {
      channelId: channel.id,
      channelType: 'email',
      success: false,
      error: result.error || 'Failed to send email',
    };
  } catch (error) {
    return {
      channelId: channel.id,
      channelType: 'email',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register the email sender with the channel router
 */
export function registerEmailSender(): void {
  registerChannelSender('email', sendEmailNotification);
}
