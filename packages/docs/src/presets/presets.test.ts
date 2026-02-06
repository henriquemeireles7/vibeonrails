import { describe, it, expect } from 'vitest';
import {
  createStarlightConfig,
  link,
  group,
  autogenerate,
  createDiataxisSidebar,
  generateThemeCSS,
  defaultThemeCSS,
} from './index.js';

describe('createStarlightConfig', () => {
  it('creates config with required title', () => {
    const config = createStarlightConfig({ title: 'My Docs' });
    expect(config.title).toBe('My Docs');
  });

  it('includes optional description', () => {
    const config = createStarlightConfig({
      title: 'My Docs',
      description: 'Testing docs',
    });
    expect(config.description).toBe('Testing docs');
  });

  it('includes social links', () => {
    const config = createStarlightConfig({
      title: 'My Docs',
      social: { github: 'https://github.com/test/test' },
    });
    expect(config.social).toEqual({ github: 'https://github.com/test/test' });
  });

  it('includes edit link', () => {
    const config = createStarlightConfig({
      title: 'My Docs',
      editLinkBaseUrl: 'https://github.com/test/test/edit/main/docs/',
    });
    expect(config.editLink).toEqual({
      baseUrl: 'https://github.com/test/test/edit/main/docs/',
    });
  });

  it('includes custom CSS', () => {
    const config = createStarlightConfig({
      title: 'My Docs',
      customCss: ['./src/styles/custom.css'],
    });
    expect(config.customCss).toEqual(['./src/styles/custom.css']);
  });

  it('includes sidebar', () => {
    const config = createStarlightConfig({
      title: 'My Docs',
      sidebar: [link('Home', 'index')],
    });
    expect(config.sidebar).toEqual([{ label: 'Home', slug: 'index' }]);
  });
});

describe('sidebar helpers', () => {
  it('creates a link', () => {
    const result = link('Intro', 'getting-started/intro');
    expect(result).toEqual({ label: 'Intro', slug: 'getting-started/intro' });
  });

  it('creates a group with default collapsed', () => {
    const result = group('API', [link('Server', 'api/server')]);
    expect(result.label).toBe('API');
    expect(result.collapsed).toBe(true);
    expect(result.items).toHaveLength(1);
  });

  it('creates a group with badge', () => {
    const result = group('Tutorials', [], {
      badge: { text: 'Learn', variant: 'tip' },
    });
    expect(result.badge).toEqual({ text: 'Learn', variant: 'tip' });
  });

  it('creates an autogenerate item', () => {
    const result = autogenerate('API', 'reference/api');
    expect(result).toEqual({
      label: 'API',
      collapsed: true,
      autogenerate: { directory: 'reference/api' },
    });
  });
});

describe('createDiataxisSidebar', () => {
  it('creates a full Diataxis sidebar structure', () => {
    const sidebar = createDiataxisSidebar({
      gettingStarted: [link('Intro', 'intro')],
      tutorials: 'tutorials',
      guides: {
        'API': 'guides/api',
        'Database': 'guides/database',
      },
      howTo: {
        'API': 'how-to/api',
      },
      reference: {
        'API': 'reference/api',
      },
    });

    expect(sidebar).toHaveLength(5);
    expect((sidebar[0] as { label: string }).label).toBe('Getting Started');
    expect((sidebar[1] as { label: string }).label).toBe('Tutorials');
    expect((sidebar[2] as { label: string }).label).toBe('Guides');
    expect((sidebar[3] as { label: string }).label).toBe('How-To Recipes');
    expect((sidebar[4] as { label: string }).label).toBe('Reference');
  });

  it('omits sections that are not provided', () => {
    const sidebar = createDiataxisSidebar({
      gettingStarted: [link('Intro', 'intro')],
    });
    expect(sidebar).toHaveLength(1);
  });

  it('appends extra sections', () => {
    const sidebar = createDiataxisSidebar({
      extra: [link('FAQ', 'faq'), link('Changelog', 'changelog')],
    });
    expect(sidebar).toHaveLength(2);
  });
});

describe('theme', () => {
  it('returns default theme CSS', () => {
    expect(defaultThemeCSS).toContain('--sl-color-accent: #6366f1');
    expect(defaultThemeCSS).toContain('--sl-font:');
  });

  it('generates theme with custom accent', () => {
    const css = generateThemeCSS({ accentColor: '#ff0000' });
    expect(css).toContain('--sl-color-accent: #ff0000');
    expect(css).not.toContain('--sl-color-accent: #6366f1');
  });

  it('generates theme with custom font', () => {
    const css = generateThemeCSS({ fontFamily: "'Roboto', sans-serif" });
    expect(css).toContain("--sl-font: 'Roboto', sans-serif");
  });

  it('appends custom CSS', () => {
    const css = generateThemeCSS({ customCSS: '.my-class { color: red; }' });
    expect(css).toContain('.my-class { color: red; }');
  });
});
