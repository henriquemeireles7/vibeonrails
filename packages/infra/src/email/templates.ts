/**
 * Email Template Engine
 *
 * Loads Markdown templates from content/locales/{lang}/emails/,
 * parses frontmatter for subject/preheader, and renders variables.
 *
 * Template format:
 * ---
 * subject: Welcome to {{appName}}, {{name}}!
 * preheader: Your account is ready
 * ---
 * # Welcome, {{name}}!
 * Body content here...
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface EmailTemplate {
  subject: string;
  preheader?: string;
  body: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Load an email template from the content directory.
 *
 * @param name - Template name (without .md extension)
 * @param locale - Locale directory (default: 'en')
 * @returns Parsed template with subject and body
 */
export async function loadTemplate(
  name: string,
  locale = 'en',
): Promise<EmailTemplate> {
  const templatePath = join(
    process.cwd(),
    'content',
    'locales',
    locale,
    'emails',
    `${name}.md`,
  );

  let content: string;
  try {
    content = await readFile(templatePath, 'utf-8');
  } catch {
    throw new Error(
      `[AOR] Email template not found: ${name}\n` +
      `  Expected path: ${templatePath}\n` +
      `  Fix: Create the template file at the path above.\n` +
      `  Docs: https://aor.dev/errors/EMAIL_TEMPLATE_NOT_FOUND`,
    );
  }

  return parseTemplate(content);
}

/**
 * Parse a Markdown template string into subject, preheader, and body.
 */
export function parseTemplate(content: string): EmailTemplate {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return {
      subject: '(No subject)',
      body: content.trim(),
    };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const subjectMatch = frontmatter.match(/^subject:\s*(.+)$/m);
  const preheaderMatch = frontmatter.match(/^preheader:\s*(.+)$/m);

  return {
    subject: subjectMatch?.[1]?.trim() ?? '(No subject)',
    preheader: preheaderMatch?.[1]?.trim(),
    body,
  };
}

/**
 * Render a template by replacing {{variable}} placeholders with data.
 *
 * @param template - Parsed email template
 * @param data - Variable substitution data
 * @returns Rendered email with subject, HTML, and plain text
 */
export function renderTemplate(
  template: EmailTemplate,
  data?: Record<string, string>,
): RenderedEmail {
  const replace = (text: string): string => {
    if (!data) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => data[key] ?? `{{${key}}}`);
  };

  const subject = replace(template.subject);
  const bodyText = replace(template.body);

  // Simple Markdown-to-HTML conversion for common patterns
  const html = markdownToHtml(bodyText);

  return {
    subject,
    html,
    text: bodyText,
  };
}

/**
 * Simple Markdown to HTML conversion for email templates.
 * Handles headings, paragraphs, bold, italic, links, and lists.
 */
function markdownToHtml(markdown: string): string {
  const html = markdown
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Unordered lists
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines → <br>
    .replace(/\n/g, '<br>');

  return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;"><p>${html}</p></div>`;
}
