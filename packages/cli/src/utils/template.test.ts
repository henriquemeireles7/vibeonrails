import { describe, it, expect } from "vitest";
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  renderTemplate,
  registerHelpers,
} from "./template.js";

describe("template utilities", () => {
  describe("toPascalCase", () => {
    it("converts single word", () => {
      expect(toPascalCase("user")).toBe("User");
    });

    it("converts kebab-case", () => {
      expect(toPascalCase("user-profile")).toBe("UserProfile");
    });

    it("converts snake_case", () => {
      expect(toPascalCase("user_profile")).toBe("UserProfile");
    });

    it("converts space-separated", () => {
      expect(toPascalCase("user profile")).toBe("UserProfile");
    });

    it("handles already PascalCase", () => {
      expect(toPascalCase("UserProfile")).toBe("UserProfile");
    });
  });

  describe("toCamelCase", () => {
    it("converts single word", () => {
      expect(toCamelCase("user")).toBe("user");
    });

    it("converts kebab-case", () => {
      expect(toCamelCase("user-profile")).toBe("userProfile");
    });

    it("converts PascalCase", () => {
      expect(toCamelCase("UserProfile")).toBe("userProfile");
    });
  });

  describe("toKebabCase", () => {
    it("converts PascalCase", () => {
      expect(toKebabCase("UserProfile")).toBe("user-profile");
    });

    it("converts camelCase", () => {
      expect(toKebabCase("userProfile")).toBe("user-profile");
    });

    it("converts space-separated", () => {
      expect(toKebabCase("user profile")).toBe("user-profile");
    });

    it("handles already kebab-case", () => {
      expect(toKebabCase("user-profile")).toBe("user-profile");
    });
  });

  describe("toSnakeCase", () => {
    it("converts PascalCase", () => {
      expect(toSnakeCase("UserProfile")).toBe("user_profile");
    });

    it("converts camelCase", () => {
      expect(toSnakeCase("userProfile")).toBe("user_profile");
    });

    it("converts kebab-case", () => {
      expect(toSnakeCase("user-profile")).toBe("user_profile");
    });
  });

  describe("renderTemplate", () => {
    it("replaces simple variables", () => {
      registerHelpers();
      const result = renderTemplate("Hello {{name}}!", { name: "World" });
      expect(result).toBe("Hello World!");
    });

    it("applies pascalCase helper", () => {
      registerHelpers();
      const result = renderTemplate("class {{pascalCase name}} {}", {
        name: "user-profile",
      });
      expect(result).toBe("class UserProfile {}");
    });

    it("applies camelCase helper", () => {
      registerHelpers();
      const result = renderTemplate("const {{camelCase name}} = {}", {
        name: "user-profile",
      });
      expect(result).toBe("const userProfile = {}");
    });

    it("applies kebabCase helper", () => {
      registerHelpers();
      const result = renderTemplate('import "./{{kebabCase name}}.css"', {
        name: "UserProfile",
      });
      expect(result).toBe('import "./user-profile.css"');
    });

    it("applies snakeCase helper", () => {
      registerHelpers();
      const result = renderTemplate(
        "const {{snakeCase name}}_table = {}",
        { name: "UserProfile" },
      );
      expect(result).toBe("const user_profile_table = {}");
    });

    it("renders multi-line template with multiple variables", () => {
      registerHelpers();
      const template = [
        "import { {{pascalCase name}}Service } from './{{kebabCase name}}.service';",
        "",
        "export const {{camelCase name}}Router = createRouter();",
      ].join("\n");
      const result = renderTemplate(template, { name: "blog-post" });
      expect(result).toContain("BlogPostService");
      expect(result).toContain("blog-post.service");
      expect(result).toContain("blogPostRouter");
    });
  });
});
