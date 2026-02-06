import { describe, it, expect, vi } from 'vitest';
import { parseApiDirective, generateApiNodes } from './api-gen.js';
import { resolveSkillContent } from './skill-loader.js';

describe('parseApiDirective', () => {
  it('parses a valid directive', () => {
    const result = parseApiDirective('api: createServer from @vibeonrails/core/api');
    expect(result).toEqual({
      exportName: 'createServer',
      packagePath: '@vibeonrails/core/api',
    });
  });

  it('returns null for invalid directive', () => {
    expect(parseApiDirective('not a valid directive')).toBeNull();
    expect(parseApiDirective('api:')).toBeNull();
    expect(parseApiDirective('api: noFrom')).toBeNull();
  });

  it('trims whitespace from package path', () => {
    const result = parseApiDirective('api: myFn from  @vibeonrails/core  ');
    expect(result?.packagePath).toBe('@vibeonrails/core');
  });
});

describe('generateApiNodes', () => {
  it('generates heading, paragraph, and code block', () => {
    const nodes = generateApiNodes({
      exportName: 'createServer',
      packagePath: '@vibeonrails/core/api',
    });

    expect(nodes).toHaveLength(3);
    expect(nodes[0]?.type).toBe('heading');
    expect(nodes[1]?.type).toBe('paragraph');
    expect(nodes[2]?.type).toBe('code');
  });

  it('sets correct heading text', () => {
    const nodes = generateApiNodes({
      exportName: 'createDatabase',
      packagePath: '@vibeonrails/core/database',
    });

    const heading = nodes[0] as { children: Array<{ value: string }> };
    expect(heading.children[0]?.value).toBe('createDatabase');
  });

  it('generates correct import statement', () => {
    const nodes = generateApiNodes({
      exportName: 'createServer',
      packagePath: '@vibeonrails/core/api',
    });

    const code = nodes[2] as { value: string };
    expect(code.value).toBe("import { createServer } from '@vibeonrails/core/api';");
  });
});

describe('resolveSkillContent', () => {
  it('returns null when SKILL.md does not exist', () => {
    const content = resolveSkillContent(
      '@vibeonrails/nonexistent',
      '/tmp/fake-project',
    );
    expect(content).toBeNull();
  });

  it('accepts custom search paths', () => {
    // Should return null since the paths don't exist
    const content = resolveSkillContent(
      '@vibeonrails/core',
      '/tmp/fake-project',
      ['/tmp/other-path'],
    );
    expect(content).toBeNull();
  });
});
