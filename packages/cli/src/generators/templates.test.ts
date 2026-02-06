import { describe, it, expect, beforeEach } from "vitest";
import { renderTemplate, registerHelpers } from "../utils/template.js";
import {
  getModuleTypesTemplate,
  getModuleServiceTemplate,
  getModuleControllerTemplate,
  getModuleServiceTestTemplate,
  getModuleIndexTemplate,
  getComponentTemplate,
  getComponentTestTemplate,
} from "./templates.js";

describe("templates", () => {
  beforeEach(() => {
    registerHelpers();
  });

  describe("module templates", () => {
    describe("getModuleTypesTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getModuleTypesTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Add your entity fields here");
        expect(template).toContain("VOR: Replace this TODO");
      });

      it("contains correct Zod imports and schema structure", () => {
        const template = getModuleTypesTemplate();
        expect(template).toContain('import { z } from "zod"');
        expect(template).toContain("{{pascalCase name}}Schema");
        expect(template).toContain("Create{{pascalCase name}}Schema");
        expect(template).toContain("Update{{pascalCase name}}Schema");
      });

      it("renders correctly with Handlebars", () => {
        const template = getModuleTypesTemplate();
        const rendered = renderTemplate(template, { name: "user" });
        expect(rendered).toContain("UserSchema");
        expect(rendered).toContain("CreateUserSchema");
        expect(rendered).toContain("UpdateUserSchema");
        expect(rendered).toContain("type User");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getModuleTypesTemplate();
        const rendered = renderTemplate(template, { name: "blog-post" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("BlogPostSchema");
      });
    });

    describe("getModuleServiceTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getModuleServiceTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Replace TODO comments");
        expect(template).toContain("VOR: Keep functions under 50 lines");
      });

      it("contains correct service structure with CRUD operations", () => {
        const template = getModuleServiceTemplate();
        expect(template).toContain("{{pascalCase name}}Service");
        expect(template).toContain("findAll");
        expect(template).toContain("findById");
        expect(template).toContain("create");
        expect(template).toContain("update");
        expect(template).toContain("remove");
      });

      it("contains correct import statement", () => {
        const template = getModuleServiceTemplate();
        expect(template).toContain('from "./types.js"');
        expect(template).toContain("Create{{pascalCase name}}");
        expect(template).toContain("Update{{pascalCase name}}");
      });

      it("renders correctly with Handlebars", () => {
        const template = getModuleServiceTemplate();
        const rendered = renderTemplate(template, { name: "user" });
        expect(rendered).toContain("UserService");
        expect(rendered).toContain("CreateUser");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getModuleServiceTemplate();
        const rendered = renderTemplate(template, { name: "blog-post" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("BlogPostService");
      });
    });

    describe("getModuleControllerTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getModuleControllerTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Router structure follows");
        expect(template).toContain("VOR: Use protectedProcedure");
      });

      it("contains correct tRPC router structure", () => {
        const template = getModuleControllerTemplate();
        expect(template).toContain("router");
        expect(template).toContain("publicProcedure");
        expect(template).toContain("{{camelCase name}}Router");
        expect(template).toContain("list");
        expect(template).toContain("getById");
        expect(template).toContain("create");
        expect(template).toContain("update");
        expect(template).toContain("remove");
      });

      it("contains correct imports", () => {
        const template = getModuleControllerTemplate();
        expect(template).toContain('from "@vibeonrails/core/api"');
        expect(template).toContain('from "./{{kebabCase name}}.service.js"');
        expect(template).toContain('from "./types.js"');
      });

      it("renders correctly with Handlebars", () => {
        const template = getModuleControllerTemplate();
        const rendered = renderTemplate(template, { name: "user" });
        expect(rendered).toContain("userRouter");
        expect(rendered).toContain("UserService");
        expect(rendered).toContain("./user.service.js");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getModuleControllerTemplate();
        const rendered = renderTemplate(template, { name: "blog-post" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("blogPostRouter");
      });
    });

    describe("getModuleServiceTestTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getModuleServiceTestTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Write tests following TDD");
        expect(template).toContain("VOR: Replace with actual test");
      });

      it("contains correct Vitest structure", () => {
        const template = getModuleServiceTestTemplate();
        expect(template).toContain(
          'import { describe, it, expect } from "vitest"',
        );
        expect(template).toContain("describe");
        expect(template).toContain("{{pascalCase name}}Service");
      });

      it("contains test cases for all CRUD operations", () => {
        const template = getModuleServiceTestTemplate();
        expect(template).toContain("findAll");
        expect(template).toContain("findById");
        expect(template).toContain("create");
        expect(template).toContain("update");
        expect(template).toContain("remove");
      });

      it("renders correctly with Handlebars", () => {
        const template = getModuleServiceTestTemplate();
        const rendered = renderTemplate(template, { name: "user" });
        expect(rendered).toContain("UserService");
        expect(rendered).toContain("./user.service.js");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getModuleServiceTestTemplate();
        const rendered = renderTemplate(template, { name: "blog-post" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("BlogPostService");
      });
    });

    describe("getModuleIndexTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getModuleIndexTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Barrel exports follow convention");
      });

      it("contains correct export statements", () => {
        const template = getModuleIndexTemplate();
        expect(template).toContain('export * from "./types.js"');
        expect(template).toContain("export { {{pascalCase name}}Service }");
        expect(template).toContain("export { {{camelCase name}}Router }");
      });

      it("renders correctly with Handlebars", () => {
        const template = getModuleIndexTemplate();
        const rendered = renderTemplate(template, { name: "user" });
        expect(rendered).toContain("UserService");
        expect(rendered).toContain("userRouter");
        expect(rendered).toContain("./user.service.js");
        expect(rendered).toContain("./user.controller.js");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getModuleIndexTemplate();
        const rendered = renderTemplate(template, { name: "blog-post" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("BlogPostService");
        expect(rendered).toContain("blogPostRouter");
      });
    });
  });

  describe("component templates", () => {
    describe("getComponentTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getComponentTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Add component props interface");
        expect(template).toContain("VOR: Implement component logic");
      });

      it("contains correct React component structure", () => {
        const template = getComponentTemplate();
        expect(template).toContain('import type { ReactNode } from "react"');
        expect(template).toContain("{{pascalCase name}}Props");
        expect(template).toContain("export function {{pascalCase name}}");
        expect(template).toContain("ReactNode");
      });

      it("renders correctly with Handlebars", () => {
        const template = getComponentTemplate();
        const rendered = renderTemplate(template, { name: "UserCard" });
        expect(rendered).toContain("UserCard");
        expect(rendered).toContain("UserCardProps");
        expect(rendered).not.toContain("{{");
      });

      it("handles kebab-case component names", () => {
        const template = getComponentTemplate();
        const rendered = renderTemplate(template, { name: "user-card" });
        expect(rendered).toContain("UserCard");
        expect(rendered).toContain("UserCardProps");
      });

      it("contains VOR comments after rendering", () => {
        const template = getComponentTemplate();
        const rendered = renderTemplate(template, { name: "Button" });
        expect(rendered).toContain("// VOR:");
      });
    });

    describe("getComponentTestTemplate", () => {
      it("returns template string with VOR comments", () => {
        const template = getComponentTestTemplate();
        expect(template).toContain("// VOR:");
        expect(template).toContain("VOR: Write tests for component behavior");
        expect(template).toContain("VOR: Replace with actual test cases");
      });

      it("contains correct Vitest and React Testing Library imports", () => {
        const template = getComponentTestTemplate();
        expect(template).toContain(
          'import { describe, it, expect } from "vitest"',
        );
        expect(template).toContain(
          'import { render, screen } from "@testing-library/react"',
        );
      });

      it("contains correct component import", () => {
        const template = getComponentTestTemplate();
        expect(template).toContain('from "./{{pascalCase name}}.jsx"');
        expect(template).toContain("{{pascalCase name}}");
      });

      it("renders correctly with Handlebars", () => {
        const template = getComponentTestTemplate();
        const rendered = renderTemplate(template, { name: "UserCard" });
        expect(rendered).toContain("UserCard");
        expect(rendered).toContain("./UserCard.jsx");
        expect(rendered).not.toContain("{{");
      });

      it("contains VOR comments after rendering", () => {
        const template = getComponentTestTemplate();
        const rendered = renderTemplate(template, { name: "Button" });
        expect(rendered).toContain("// VOR:");
        expect(rendered).toContain("Button");
      });
    });
  });

  describe("template consistency", () => {
    it("all module templates use .js extension in imports", () => {
      const templates = [
        getModuleServiceTemplate(),
        getModuleControllerTemplate(),
        getModuleServiceTestTemplate(),
        getModuleIndexTemplate(),
      ];

      for (const template of templates) {
        const imports = template.match(/from\s+["']([^"']+)["']/g) || [];
        for (const imp of imports) {
          if (imp.includes("./") && !imp.includes(".js")) {
            throw new Error(`Import missing .js extension: ${imp}`);
          }
        }
      }
    });

    it("all templates contain at least one VOR comment", () => {
      const templates = [
        getModuleTypesTemplate(),
        getModuleServiceTemplate(),
        getModuleControllerTemplate(),
        getModuleServiceTestTemplate(),
        getModuleIndexTemplate(),
        getComponentTemplate(),
        getComponentTestTemplate(),
      ];

      for (const template of templates) {
        expect(template).toContain("// VOR:");
      }
    });

    it("all templates render without Handlebars syntax errors", () => {
      const templates = [
        { fn: getModuleTypesTemplate, data: { name: "test" } },
        { fn: getModuleServiceTemplate, data: { name: "test" } },
        { fn: getModuleControllerTemplate, data: { name: "test" } },
        { fn: getModuleServiceTestTemplate, data: { name: "test" } },
        { fn: getModuleIndexTemplate, data: { name: "test" } },
        { fn: getComponentTemplate, data: { name: "test" } },
        { fn: getComponentTestTemplate, data: { name: "test" } },
      ];

      for (const { fn, data } of templates) {
        const template = fn();
        const rendered = renderTemplate(template, data);
        expect(rendered).not.toContain("{{");
        expect(rendered).not.toContain("}}");
      }
    });
  });
});
