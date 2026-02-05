import { describe, it, expect } from 'vitest';
import { parseTemplate, renderTemplate } from './templates.js';

describe('parseTemplate', () => {
  it('should parse frontmatter with subject and preheader', () => {
    const content = `---
subject: Welcome to {{appName}}
preheader: Your account is ready
---
# Hello, {{name}}!

Welcome to the app.`;

    const template = parseTemplate(content);

    expect(template.subject).toBe('Welcome to {{appName}}');
    expect(template.preheader).toBe('Your account is ready');
    expect(template.body).toContain('# Hello, {{name}}!');
  });

  it('should handle templates without frontmatter', () => {
    const content = 'Just a plain email body.';
    const template = parseTemplate(content);

    expect(template.subject).toBe('(No subject)');
    expect(template.body).toBe('Just a plain email body.');
  });

  it('should handle missing preheader', () => {
    const content = `---
subject: Test Subject
---
Body here.`;

    const template = parseTemplate(content);

    expect(template.subject).toBe('Test Subject');
    expect(template.preheader).toBeUndefined();
  });
});

describe('renderTemplate', () => {
  it('should replace variables in subject and body', () => {
    const template = {
      subject: 'Welcome, {{name}}!',
      body: 'Hello **{{name}}**, welcome to {{appName}}.',
    };

    const result = renderTemplate(template, { name: 'John', appName: 'MyApp' });

    expect(result.subject).toBe('Welcome, John!');
    expect(result.text).toContain('Hello **John**, welcome to MyApp.');
  });

  it('should keep unreplaced variables intact', () => {
    const template = { subject: '{{missing}}', body: 'Hello' };
    const result = renderTemplate(template, {});

    expect(result.subject).toBe('{{missing}}');
  });

  it('should convert Markdown to HTML', () => {
    const template = {
      subject: 'Test',
      body: '# Heading\n\nHello **world**!\n\n[Click here](https://example.com)',
    };

    const result = renderTemplate(template);

    expect(result.html).toContain('<h1>Heading</h1>');
    expect(result.html).toContain('<strong>world</strong>');
    expect(result.html).toContain('<a href="https://example.com">Click here</a>');
  });

  it('should return both HTML and plain text', () => {
    const template = { subject: 'Test', body: 'Plain text body' };
    const result = renderTemplate(template);

    expect(result.html).toContain('Plain text body');
    expect(result.text).toBe('Plain text body');
  });
});
