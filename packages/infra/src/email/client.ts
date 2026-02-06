/**
 * Email Client
 *
 * Sends transactional emails using Resend with Markdown-based templates.
 * Templates are stored in content/locales/{lang}/emails/.
 *
 * Usage:
 *   import { sendEmail } from '@vibeonrails/infra/email';
 *
 *   await sendEmail('welcome', {
 *     to: 'user@example.com',
 *     data: { name: 'John', appName: 'MyApp' },
 *   });
 */

import { Resend } from 'resend';
import { loadTemplate, renderTemplate } from './templates.js';

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[AOR] RESEND_API_KEY environment variable is required.\n' +
      '  Fix: Add RESEND_API_KEY to your .env file.\n' +
      '  Docs: https://vibeonrails.dev/errors/RESEND_API_KEY_MISSING',
    );
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Template data for variable substitution */
  data?: Record<string, string>;
  /** Override the sender address */
  from?: string;
}

/**
 * Send a transactional email using a named template.
 *
 * @param templateName - Name of the template file (without extension)
 * @param options - Email options including recipient and template data
 */
export async function sendEmail(
  templateName: string,
  options: SendEmailOptions,
): Promise<void> {
  const client = getClient();
  const from = options.from ?? process.env.EMAIL_FROM ?? 'hello@example.com';

  const template = await loadTemplate(templateName);
  const { subject, html, text } = renderTemplate(template, options.data);

  await client.emails.send({
    from,
    to: options.to,
    subject,
    html,
    text,
  });
}
