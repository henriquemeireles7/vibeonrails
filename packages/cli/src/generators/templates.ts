/**
 * Template strings for generated code with VOR (Vibe on Rails) inline comments.
 *
 * VOR comments guide AI agents on:
 * - What to modify (business logic, fields, etc.)
 * - What patterns to follow (conventions, best practices)
 * - What to leave alone (framework code, structure)
 *
 * These templates use Handlebars syntax and should be rendered with renderTemplate().
 */

// ---------------------------------------------------------------------------
// Module Templates
// ---------------------------------------------------------------------------

/**
 * Template for module types.ts file.
 * Generates Zod schemas and TypeScript types for a module.
 */
export function getModuleTypesTemplate(): string {
  return `import { z } from "zod";

// ---------------------------------------------------------------------------
// {{pascalCase name}} — Schemas
// ---------------------------------------------------------------------------

// VOR: Add your entity fields here. Use Zod validators (z.string(), z.number(), etc.)
// VOR: Keep schemas focused on data validation. Business rules go in the service layer.
export const {{pascalCase name}}Schema = z.object({
  id: z.string().uuid(),
  // VOR: Replace this TODO with your actual fields. Example: name: z.string().min(1)
  createdAt: z.date(),
  updatedAt: z.date(),
});

// VOR: Create schema omits auto-generated fields. Don't modify the omit() call.
export const Create{{pascalCase name}}Schema = {{pascalCase name}}Schema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// VOR: Update schema makes all fields optional. Don't modify the .partial() call.
export const Update{{pascalCase name}}Schema = Create{{pascalCase name}}Schema.partial();

// ---------------------------------------------------------------------------
// {{pascalCase name}} — Types
// ---------------------------------------------------------------------------

// VOR: Types are inferred from schemas. Don't manually define types here.
export type {{pascalCase name}} = z.infer<typeof {{pascalCase name}}Schema>;
export type Create{{pascalCase name}} = z.infer<typeof Create{{pascalCase name}}Schema>;
export type Update{{pascalCase name}} = z.infer<typeof Update{{pascalCase name}}Schema>;
`;
}

/**
 * Template for module service.ts file.
 * Generates business logic service with CRUD operations.
 */
export function getModuleServiceTemplate(): string {
  return `import type { Create{{pascalCase name}}, Update{{pascalCase name}}, {{pascalCase name}} } from "./types.js";

// ---------------------------------------------------------------------------
// {{pascalCase name}}Service — Business Logic
// ---------------------------------------------------------------------------

// VOR: Replace TODO comments with actual database queries using Drizzle ORM.
// VOR: Keep functions under 50 lines. Extract complex logic into helper functions.
// VOR: Use AppError subclasses (NotFoundError, ValidationError) for error handling.
export const {{pascalCase name}}Service = {
  // VOR: Implement database query using Drizzle. Return all {{camelCase name}} records.
  async findAll(): Promise<{{pascalCase name}}[]> {
    // VOR: Replace with database query. Example: return db.select().from({{camelCase name}}Table);
    return [];
  },

  // VOR: Implement database query to find by ID. Return null if not found.
  async findById(id: string): Promise<{{pascalCase name}} | null> {
    // VOR: Replace with database query. Use .findFirst() or .findUnique() pattern.
    void id;
    return null;
  },

  // VOR: Implement database insert. Generate UUID for id, set timestamps.
  async create(data: Create{{pascalCase name}}): Promise<{{pascalCase name}}> {
    // VOR: Replace with database insert. Use db.insert().values().returning() pattern.
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as {{pascalCase name}};
  },

  // VOR: Implement database update. Return null if record not found.
  async update(id: string, data: Update{{pascalCase name}}): Promise<{{pascalCase name}} | null> {
    // VOR: Replace with database update. Use db.update().set().where().returning() pattern.
    void id;
    void data;
    return null;
  },

  // VOR: Implement database delete. Return true if deleted, false if not found.
  async remove(id: string): Promise<boolean> {
    // VOR: Replace with database delete. Use db.delete().where() pattern.
    void id;
    return false;
  },
};
`;
}

/**
 * Template for module controller.ts file.
 * Generates tRPC router with CRUD endpoints.
 */
export function getModuleControllerTemplate(): string {
  return `import { z } from "zod";
import { router, publicProcedure } from "@vibeonrails/core/api";
import { {{pascalCase name}}Service } from "./{{kebabCase name}}.service.js";
import { Create{{pascalCase name}}Schema, Update{{pascalCase name}}Schema } from "./types.js";

// ---------------------------------------------------------------------------
// {{pascalCase name}} — tRPC Controller
// ---------------------------------------------------------------------------

// VOR: Router structure follows tRPC conventions. Don't modify router() wrapper.
// VOR: Use protectedProcedure instead of publicProcedure for authenticated endpoints.
// VOR: Add custom procedures here (e.g., search, bulk operations) following the same pattern.
export const {{camelCase name}}Router = router({
  // VOR: List endpoint returns all records. Add pagination if needed.
  list: publicProcedure.query(async () => {
    return {{pascalCase name}}Service.findAll();
  }),

  // VOR: GetById endpoint validates UUID input. Don't modify the input schema.
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return {{pascalCase name}}Service.findById(input.id);
    }),

  // VOR: Create endpoint uses CreateSchema for validation. Don't modify the input.
  create: publicProcedure
    .input(Create{{pascalCase name}}Schema)
    .mutation(async ({ input }) => {
      return {{pascalCase name}}Service.create(input);
    }),

  // VOR: Update endpoint requires id + data. Don't modify the input structure.
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: Update{{pascalCase name}}Schema,
      }),
    )
    .mutation(async ({ input }) => {
      return {{pascalCase name}}Service.update(input.id, input.data);
    }),

  // VOR: Remove endpoint validates UUID. Don't modify the input schema.
  remove: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return {{pascalCase name}}Service.remove(input.id);
    }),
});
`;
}

/**
 * Template for module service.test.ts file.
 * Generates Vitest test suite for the service.
 */
export function getModuleServiceTestTemplate(): string {
  return `import { describe, it, expect } from "vitest";
import { {{pascalCase name}}Service } from "./{{kebabCase name}}.service.js";

// VOR: Write tests following TDD principles. Test implementation, not framework code.
// VOR: Add more test cases as you implement business logic (edge cases, validation, etc.).
describe("{{pascalCase name}}Service", () => {
  describe("findAll", () => {
    // VOR: Replace with actual test once database is implemented.
    it("returns an empty array by default", async () => {
      const result = await {{pascalCase name}}Service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    // VOR: Replace with actual test once database is implemented.
    it("returns null for unknown id", async () => {
      const result = await {{pascalCase name}}Service.findById("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    // VOR: Replace with actual test once database is implemented. Test validation, required fields, etc.
    it("returns a new {{camelCase name}} with an id", async () => {
      const result = await {{pascalCase name}}Service.create({} as Parameters<typeof {{pascalCase name}}Service.create>[0]);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });
  });

  describe("update", () => {
    // VOR: Replace with actual test once database is implemented.
    it("returns null for unknown id", async () => {
      const result = await {{pascalCase name}}Service.update("non-existent-id", {});
      expect(result).toBeNull();
    });
  });

  describe("remove", () => {
    // VOR: Replace with actual test once database is implemented.
    it("returns false for unknown id", async () => {
      const result = await {{pascalCase name}}Service.remove("non-existent-id");
      expect(result).toBe(false);
    });
  });
});
`;
}

/**
 * Template for module index.ts file.
 * Generates barrel exports for the module.
 */
export function getModuleIndexTemplate(): string {
  return `// VOR: Barrel exports follow convention. Don't modify export paths.
// VOR: Add additional exports here if you create new files in this module.
export * from "./types.js";
export { {{pascalCase name}}Service } from "./{{kebabCase name}}.service.js";
export { {{camelCase name}}Router } from "./{{kebabCase name}}.controller.js";
`;
}

// ---------------------------------------------------------------------------
// Component Templates
// ---------------------------------------------------------------------------

/**
 * Template for React component .tsx file.
 * Generates a functional React component with TypeScript.
 */
export function getComponentTemplate(): string {
  return `import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// {{pascalCase name}} — React Component
// ---------------------------------------------------------------------------

// VOR: Add component props interface here. Use descriptive prop names.
// VOR: Keep components focused on presentation. Business logic goes in hooks/services.
export interface {{pascalCase name}}Props {
  // VOR: Add your props here. Example: title: string; children?: ReactNode;
}

// VOR: Implement component logic here. Keep functions under 50 lines.
// VOR: Use CSS classes from @vibeonrails/web/styles. Import: import "@vibeonrails/web/styles/components.css"
// VOR: For form components, use controlled inputs with useState or form libraries.
export function {{pascalCase name}}(props: {{pascalCase name}}Props): ReactNode {
  // VOR: Add component implementation here.
  // VOR: Use hooks from @vibeonrails/web/hooks if needed (useAuth, etc.).
  return (
    <div className="component">
      {/* VOR: Replace with your component JSX */}
      <p>{{pascalCase name}} component</p>
    </div>
  );
}
`;
}

/**
 * Template for React component test .test.tsx file.
 * Generates Vitest test suite for the component.
 */
export function getComponentTestTemplate(): string {
  return `import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { {{pascalCase name}} } from "./{{pascalCase name}}.jsx";

// VOR: Write tests for component behavior, not implementation details.
// VOR: Test user interactions, prop changes, and edge cases.
describe("{{pascalCase name}}", () => {
  // VOR: Replace with actual test cases once component is implemented.
  it("renders without crashing", () => {
    render(<{{pascalCase name}} />);
    expect(screen.getByText("{{pascalCase name}} component")).toBeInTheDocument();
  });

  // VOR: Add more test cases for props, interactions, edge cases, etc.
});
`;
}
