/**
 * Sidebar generation utilities for Starlight.
 *
 * Provides helpers to build sidebar configurations that follow
 * the Diataxis documentation framework (Tutorials, Guides, How-To, Reference).
 */

/** A single sidebar link item. */
export interface SidebarLink {
  label: string;
  slug: string;
}

/** A sidebar group that can contain links or nested groups. */
export interface SidebarGroup {
  label: string;
  collapsed?: boolean;
  badge?: { text: string; variant: 'tip' | 'note' | 'caution' | 'danger' };
  items: Array<SidebarLink | SidebarGroup | SidebarAutoGenerate>;
}

/** An auto-generated sidebar section from a directory. */
export interface SidebarAutoGenerate {
  label: string;
  collapsed?: boolean;
  autogenerate: { directory: string };
}

export type SidebarItem = SidebarLink | SidebarGroup | SidebarAutoGenerate;

/**
 * Create a sidebar link.
 *
 * @param label - Display label
 * @param slug - Content collection slug (e.g. "getting-started/introduction")
 */
export function link(label: string, slug: string): SidebarLink {
  return { label, slug };
}

/**
 * Create a collapsible sidebar group.
 *
 * @param label - Group label
 * @param items - Child items (links, groups, or autogenerate)
 * @param options - Additional options (collapsed, badge)
 */
export function group(
  label: string,
  items: SidebarItem[],
  options: { collapsed?: boolean; badge?: SidebarGroup['badge'] } = {},
): SidebarGroup {
  return {
    label,
    items,
    collapsed: options.collapsed ?? true,
    ...( options.badge ? { badge: options.badge } : {}),
  };
}

/**
 * Create an auto-generated sidebar section from a directory.
 *
 * @param label - Section label
 * @param directory - Content directory to scan (relative to docs root)
 * @param collapsed - Whether the section starts collapsed
 */
export function autogenerate(
  label: string,
  directory: string,
  collapsed = true,
): SidebarAutoGenerate {
  return {
    label,
    collapsed,
    autogenerate: { directory },
  };
}

/**
 * Create a standard Diataxis sidebar structure.
 *
 * Generates sidebar sections for Tutorials, Guides, How-To, Reference,
 * and any additional custom sections.
 *
 * @param options - Section configuration
 * @returns Complete sidebar configuration array
 */
export function createDiataxisSidebar(options: {
  /** Getting started section items. */
  gettingStarted?: SidebarItem[];
  /** Tutorial items or auto-generate directory. */
  tutorials?: SidebarItem[] | string;
  /** Guide sections (each key becomes a collapsible group). */
  guides?: Record<string, SidebarItem[] | string>;
  /** How-to recipe sections. */
  howTo?: Record<string, string>;
  /** Feature sections. */
  features?: Record<string, string>;
  /** Reference sections. */
  reference?: Record<string, string>;
  /** Additional sections appended at the end. */
  extra?: SidebarItem[];
}): SidebarItem[] {
  const sidebar: SidebarItem[] = [];

  // Getting Started
  if (options.gettingStarted) {
    sidebar.push(group('Getting Started', options.gettingStarted, { collapsed: false }));
  }

  // Tutorials
  if (options.tutorials) {
    const items = typeof options.tutorials === 'string'
      ? [autogenerate('All', options.tutorials)]
      : options.tutorials;
    sidebar.push(group('Tutorials', items, {
      badge: { text: 'Learn', variant: 'tip' },
    }));
  }

  // Guides
  if (options.guides) {
    const guideItems: SidebarItem[] = [];
    for (const [label, items] of Object.entries(options.guides)) {
      if (typeof items === 'string') {
        guideItems.push(autogenerate(label, items));
      } else {
        guideItems.push(group(label, items));
      }
    }
    sidebar.push(group('Guides', guideItems, {
      collapsed: false,
      badge: { text: 'Understand', variant: 'note' },
    }));
  }

  // How-To Recipes
  if (options.howTo) {
    const howToItems: SidebarItem[] = [];
    for (const [label, directory] of Object.entries(options.howTo)) {
      howToItems.push(autogenerate(label, directory));
    }
    sidebar.push(group('How-To Recipes', howToItems, {
      badge: { text: 'Recipes', variant: 'caution' },
    }));
  }

  // Features
  if (options.features) {
    const featureItems: SidebarItem[] = [];
    for (const [label, directory] of Object.entries(options.features)) {
      featureItems.push(autogenerate(label, directory));
    }
    sidebar.push(group('Features', featureItems));
  }

  // Reference
  if (options.reference) {
    const refItems: SidebarItem[] = [];
    for (const [label, directory] of Object.entries(options.reference)) {
      refItems.push(autogenerate(label, directory));
    }
    sidebar.push(group('Reference', refItems, {
      badge: { text: 'API', variant: 'danger' },
    }));
  }

  // Extra
  if (options.extra) {
    sidebar.push(...options.extra);
  }

  return sidebar;
}
