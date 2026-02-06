/**
 * Deterministic Path Conventions
 *
 * Computes deterministic file paths from intent.
 * Used by CLI generators and AI agents for predictable file placement.
 *
 * Examples:
 *   pathFor('module', 'order', 'service') → 'src/modules/order/order.service.ts'
 *   pathFor('heuristic', 'hook', 'pain') → 'content/marketing/heuristics/hooks/pain.md'
 *   pathFor('component', 'Button') → 'src/web/components/Button/Button.tsx'
 */

/**
 * Path intent types.
 */
export type PathIntent =
  | "module"
  | "component"
  | "heuristic"
  | "content"
  | "config"
  | "manifest"
  | "skill"
  | "template"
  | "test"
  | "migration"
  | "seed"
  | "page"
  | "channel"
  | "task"
  | "email";

/**
 * Module file types.
 */
export type ModuleFileType =
  | "types"
  | "service"
  | "controller"
  | "test"
  | "schema"
  | "skill"
  | "index";

/**
 * Content types for the content directory.
 */
export type ContentType =
  | "blog"
  | "help"
  | "changelog"
  | "pages"
  | "incidents"
  | "feedback"
  | "brand";

/**
 * Heuristic types for marketing.
 */
export type HeuristicType =
  | "client"
  | "product"
  | "hook"
  | "story"
  | "concept"
  | "branding"
  | "cta";

/**
 * Convert a name to kebab-case.
 */
export function toKebabCase(name: string): string {
  return name
    .replace(/([A-Z])/g, "-$1")
    .replace(/^-/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Convert a name to PascalCase.
 */
export function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Compute a deterministic file path from intent and arguments.
 *
 * @param intent - What kind of file this is
 * @param args - Intent-specific arguments
 * @returns Relative file path from project root
 */
export function pathFor(
  intent: PathIntent,
  ...args: readonly string[]
): string {
  switch (intent) {
    case "module":
      return modulePathFor(
        args[0] ?? "",
        args[1] as ModuleFileType | undefined,
      );

    case "component":
      return componentPathFor(args[0] ?? "");

    case "heuristic":
      return heuristicPathFor(
        (args[0] as HeuristicType) ?? "hook",
        args[1] ?? "",
      );

    case "content":
      return contentPathFor((args[0] as ContentType) ?? "blog", args[1] ?? "");

    case "config":
      return configPathFor(args[0] ?? "");

    case "manifest":
      return manifestPathFor(args[0] ?? "");

    case "skill":
      return skillPathFor(args[0] ?? "");

    case "template":
      return templatePathFor(args[0] ?? "", args[1] ?? "");

    case "test":
      return testPathFor(args[0] ?? "");

    case "migration":
      return migrationPathFor(args[0] ?? "");

    case "seed":
      return seedPathFor(args[0] ?? "");

    case "page":
      return pagePathFor(args[0] ?? "");

    case "channel":
      return channelPathFor(args[0] ?? "", args[1] ?? "drafts");

    case "task":
      return taskPathFor(args[0] ?? "", args[1] ?? "backlog");

    case "email":
      return emailPathFor(args[0] ?? "");

    default:
      throw new Error(`Unknown path intent: ${intent}`);
  }
}

// --- Internal path builders ---

function modulePathFor(name: string, fileType?: ModuleFileType): string {
  const kebab = toKebabCase(name);

  if (!fileType || fileType === "index") {
    return `src/modules/${kebab}/index.ts`;
  }

  switch (fileType) {
    case "types":
      return `src/modules/${kebab}/${kebab}.types.ts`;
    case "service":
      return `src/modules/${kebab}/${kebab}.service.ts`;
    case "controller":
      return `src/modules/${kebab}/${kebab}.controller.ts`;
    case "test":
      return `src/modules/${kebab}/${kebab}.test.ts`;
    case "schema":
      return `src/modules/${kebab}/${kebab}.schema.ts`;
    case "skill":
      return `src/modules/${kebab}/SKILL.md`;
    default:
      return `src/modules/${kebab}/index.ts`;
  }
}

function componentPathFor(name: string): string {
  const pascal = toPascalCase(name);
  return `src/web/components/${pascal}/${pascal}.tsx`;
}

function heuristicPathFor(type: HeuristicType, name: string): string {
  const kebab = toKebabCase(name);
  const plural = type.endsWith("s") ? type : `${type}s`;
  return `content/marketing/heuristics/${plural}/${kebab}.md`;
}

function contentPathFor(type: ContentType, slug: string): string {
  const kebab = toKebabCase(slug);
  return `content/${type}/${kebab}.md`;
}

function configPathFor(name: string): string {
  const kebab = toKebabCase(name);
  return `config/${kebab}.ts`;
}

function manifestPathFor(name: string): string {
  const kebab = toKebabCase(name);
  return `.vibe/${kebab}.json`;
}

function skillPathFor(dir: string): string {
  return `${dir}/SKILL.md`;
}

function templatePathFor(type: string, name: string): string {
  const kebab = toKebabCase(name);
  return `content/emails/${type}/${kebab}.md`;
}

function testPathFor(sourcePath: string): string {
  return sourcePath.replace(/\.ts$/, ".test.ts");
}

function migrationPathFor(name: string): string {
  const timestamp = Date.now();
  const kebab = toKebabCase(name);
  return `src/database/migrations/${timestamp}_${kebab}.ts`;
}

function seedPathFor(name: string): string {
  const kebab = toKebabCase(name);
  return `src/database/seeds/${kebab}.seed.ts`;
}

function pagePathFor(name: string): string {
  const pascal = toPascalCase(name);
  return `src/web/pages/${pascal}.tsx`;
}

function channelPathFor(channel: string, status: string): string {
  const kebab = toKebabCase(channel);
  return `content/marketing/channels/${kebab}/${status}`;
}

function taskPathFor(slug: string, category: string): string {
  const kebab = toKebabCase(slug);
  return `.plan/tasks/${category}/${kebab}.md`;
}

function emailPathFor(name: string): string {
  const kebab = toKebabCase(name);
  return `content/emails/${kebab}.md`;
}
