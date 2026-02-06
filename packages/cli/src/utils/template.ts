import Handlebars from "handlebars";

/**
 * Split a string into words by common separators (camelCase, kebab-case, snake_case, spaces).
 */
function splitWords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase / PascalCase boundary
    .replace(/[-_]/g, " ") // kebab / snake
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Converts a string to PascalCase — e.g. "user-profile" → "UserProfile" */
export function toPascalCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/** Converts a string to camelCase — e.g. "user-profile" → "userProfile" */
export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Converts a string to kebab-case — e.g. "UserProfile" → "user-profile" */
export function toKebabCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join("-");
}

/** Converts a string to snake_case — e.g. "UserProfile" → "user_profile" */
export function toSnakeCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join("_");
}

/** Register Handlebars helpers for case conversion. Call once before rendering. */
export function registerHelpers(): void {
  Handlebars.registerHelper("pascalCase", (str: string) => toPascalCase(str));
  Handlebars.registerHelper("camelCase", (str: string) => toCamelCase(str));
  Handlebars.registerHelper("kebabCase", (str: string) => toKebabCase(str));
  Handlebars.registerHelper("snakeCase", (str: string) => toSnakeCase(str));
}

/** Compile and render a Handlebars template string with the given data. */
export function renderTemplate(
  templateString: string,
  data: Record<string, unknown>,
): string {
  const compiled = Handlebars.compile(templateString, { noEscape: true });
  return compiled(data);
}
