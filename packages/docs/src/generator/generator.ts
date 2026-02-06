/**
 * AI Documentation Generator
 *
 * Sends structured prompts to Anthropic Claude and receives MDX content.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TemplateName, TemplateContext } from './templates.js';
import { renderPrompt } from './templates.js';
import { cleanGeneratedContent } from './validator.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

/** Options for a single page generation call. */
export interface GeneratePageOptions {
  /** Prompt template name */
  template: TemplateName;
  /** Template context data */
  context: TemplateContext;
  /** Anthropic model override */
  model?: string;
  /** Project root for template resolution */
  projectRoot?: string;
}

/**
 * Create an Anthropic client.
 * Reads ANTHROPIC_API_KEY from environment.
 *
 * @throws Error if ANTHROPIC_API_KEY is not set
 */
export function createAIClient(): Anthropic {
  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    throw new Error(
      '[AOR] ANTHROPIC_API_KEY environment variable is required.\n' +
      '  Fix: Set ANTHROPIC_API_KEY in your environment or .env file.\n' +
      '  Get a key at: https://console.anthropic.com/\n' +
      '  Docs: https://vibeonrails.dev/guides/docs/ai-generation',
    );
  }

  return new Anthropic({ apiKey });
}

/**
 * Generate a single documentation page using Claude.
 *
 * @param client - Anthropic client instance
 * @param options - Page generation options
 * @returns Generated MDX content string
 */
export async function generatePage(
  client: Anthropic,
  options: GeneratePageOptions,
): Promise<string> {
  const { template, context, model, projectRoot } = options;

  // Render the prompt from the template
  const prompt = renderPrompt(template, context, projectRoot);

  // Call Claude
  const response = await client.messages.create({
    model: model ?? DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text content
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[AOR] Claude returned no text content');
  }

  // Clean the output (strip code fences, normalize whitespace)
  return cleanGeneratedContent(textBlock.text);
}

/**
 * Generate multiple pages with rate limiting.
 *
 * @param client - Anthropic client instance
 * @param pages - Array of page generation options
 * @param onProgress - Optional progress callback
 * @returns Array of generated MDX strings (or null for failures)
 */
export async function generatePages(
  client: Anthropic,
  pages: GeneratePageOptions[],
  onProgress?: (current: number, total: number, pagePath: string) => void,
): Promise<Array<{ content: string | null; error?: string }>> {
  const results: Array<{ content: string | null; error?: string }> = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;

    onProgress?.(i + 1, pages.length, page.template);

    try {
      const content = await generatePage(client, page);
      results.push({ content });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ content: null, error: message });
    }

    // Rate limiting: brief pause between calls to avoid hitting API limits
    if (i < pages.length - 1) {
      await sleep(500);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
