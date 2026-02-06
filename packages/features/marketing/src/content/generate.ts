export type ContentType = 'social_post' | 'email' | 'blog_outline';

export interface GenerateContentOptions {
  type: ContentType;
  topic: string;
  tone?: string;
  maxLength?: number;
}

export interface GeneratedContent {
  type: ContentType;
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Generates marketing content based on the provided options.
 * Stub implementation -- replace with AI-powered generation.
 */
export function generateContent(
  options: GenerateContentOptions,
): GeneratedContent {
  return {
    type: options.type,
    content: '',
    metadata: {
      topic: options.topic,
      tone: options.tone ?? 'professional',
    },
  };
}
