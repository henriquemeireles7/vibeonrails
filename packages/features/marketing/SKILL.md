# @vibeonrails/marketing

## Purpose
Marketing automation toolkit for Vibe on Rails applications. Generate content, schedule social media posts across platforms, and run email drip sequences.

## Modules

### Content (`content/generate.ts`)
- `ContentType` - Union type: `social_post | email | blog_outline`
- `generateContent(options)` - Stub content generator. Wire to an AI provider for production.

### Social (`social/`)
- `Platform` - Union type: `twitter | linkedin | instagram`
- `PlatformAdapter` - Interface with `post(content)` and `delete(id)` methods.
- `definePlatform(platform, adapter)` - Register a platform with its adapter.
- `schedulePost(platform, content, scheduledAt)` - Schedule a post for future publishing.
- `getScheduledPosts()` - List all scheduled posts.

### Sequences (`sequences/`)
- `SequenceStep` - A single email step with name, delay, subject, and body.
- `EmailSequence` - A named collection of sequence steps.
- `defineSequence(name, steps)` - Create an email sequence definition.
- `runSequence(sequence)` - Start executing a sequence (stub).

## Usage
```typescript
import {
  generateContent,
  schedulePost,
  defineSequence,
  runSequence,
} from '@vibeonrails/marketing';

const content = generateContent({
  type: 'social_post',
  topic: 'Product launch',
  tone: 'exciting',
});

schedulePost('twitter', content.content, new Date('2025-03-01'));

const sequence = defineSequence('Onboarding', [
  { name: 'Welcome', delayDays: 0, subject: 'Welcome!', body: '...' },
  { name: 'Follow-up', delayDays: 3, subject: 'How is it going?', body: '...' },
]);

runSequence(sequence);
```

## Notes
- In-memory stores are for development. Replace with persistent storage for production.
- Platform adapters must be implemented per platform (Twitter API, LinkedIn API, etc.).
- Content generation is a stub -- connect to OpenAI or similar for real content.
