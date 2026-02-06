import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseDescription,
  generateSchemaFile,
  generateServiceFile,
  generateControllerFile,
  generateTestFile,
  generateSkillFile,
  generateIndexFile,
  generateModuleFromDescription,
  writeGeneratedFiles,
} from "./generate-ai.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-genai-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI Module Generation", () => {
  // -----------------------------------------------------------------------
  // Description Parsing
  // -----------------------------------------------------------------------

  describe("parseDescription", () => {
    it("detects entities from description", () => {
      const spec = parseDescription(
        "order",
        "e-commerce orders with Stripe checkout, inventory tracking",
      );
      expect(spec.entities.length).toBeGreaterThan(0);
      expect(spec.entities.some((e) => e.name === "Order")).toBe(true);
    });

    it("detects integrations from description", () => {
      const spec = parseDescription(
        "order",
        "orders with Stripe payments and email confirmations",
      );
      expect(spec.integrations).toContain("stripe");
      expect(spec.integrations).toContain("email");
    });

    it("detects operations from description", () => {
      const spec = parseDescription(
        "order",
        "orders with checkout and refund capabilities",
      );
      expect(spec.operations).toContain("checkout");
      expect(spec.operations).toContain("refund");
    });

    it("creates a default entity when none detected", () => {
      const spec = parseDescription(
        "widget",
        "a simple data management system",
      );
      expect(spec.entities).toHaveLength(1);
      expect(spec.entities[0]!.name).toBe("Widget");
    });

    it("always includes CRUD operations", () => {
      const spec = parseDescription("simple", "basic data storage");
      expect(spec.operations).toContain("create");
      expect(spec.operations).toContain("list");
    });

    it("preserves the module name and description", () => {
      const spec = parseDescription("order", "e-commerce order management");
      expect(spec.name).toBe("order");
      expect(spec.description).toBe("e-commerce order management");
    });
  });

  // -----------------------------------------------------------------------
  // Code Generation
  // -----------------------------------------------------------------------

  describe("generateSchemaFile", () => {
    it("generates valid Zod schema code", () => {
      const spec = parseDescription("order", "order management");
      const content = generateSchemaFile(spec);

      expect(content).toContain('import { z } from "zod"');
      expect(content).toContain("orderSchema");
      expect(content).toContain("z.object");
      expect(content).toContain("z.string()");
      expect(content).toContain("createOrderSchema");
    });

    it("includes VOR comment markers", () => {
      const spec = parseDescription("order", "test");
      const content = generateSchemaFile(spec);
      expect(content).toContain("VOR:");
    });
  });

  describe("generateServiceFile", () => {
    it("generates CRUD service functions", () => {
      const spec = parseDescription("order", "order management");
      const content = generateServiceFile(spec);

      expect(content).toContain("createOrder");
      expect(content).toContain("getOrderById");
      expect(content).toContain("listOrders");
      expect(content).toContain("updateOrder");
      expect(content).toContain("deleteOrder");
    });

    it("includes import for types", () => {
      const spec = parseDescription("order", "order management");
      const content = generateServiceFile(spec);
      expect(content).toContain("order.types.js");
    });
  });

  describe("generateControllerFile", () => {
    it("generates tRPC controller structure", () => {
      const spec = parseDescription("order", "order management");
      const content = generateControllerFile(spec);

      expect(content).toContain("tRPC controller");
      expect(content).toContain("publicProcedure");
      expect(content).toContain("createOrderSchema");
    });
  });

  describe("generateTestFile", () => {
    it("generates test file with CRUD tests", () => {
      const spec = parseDescription("order", "order management");
      const content = generateTestFile(spec);

      expect(content).toContain('import { describe, it, expect } from "vitest"');
      expect(content).toContain("creates a order");
      expect(content).toContain("gets a order by id");
      expect(content).toContain("lists all orders");
      expect(content).toContain("updates a order");
      expect(content).toContain("deletes a order");
    });
  });

  describe("generateSkillFile", () => {
    it("generates SKILL.md with module docs", () => {
      const spec = parseDescription("order", "e-commerce order management");
      const content = generateSkillFile(spec);

      expect(content).toContain("# Order Module");
      expect(content).toContain("e-commerce order management");
      expect(content).toContain("Entities");
      expect(content).toContain("Files");
    });
  });

  describe("generateIndexFile", () => {
    it("generates barrel export", () => {
      const spec = parseDescription("order", "orders");
      const content = generateIndexFile(spec);

      expect(content).toContain("order.types.js");
      expect(content).toContain("order.service.js");
      expect(content).toContain("order.controller.js");
    });
  });

  // -----------------------------------------------------------------------
  // Full Generation Pipeline
  // -----------------------------------------------------------------------

  describe("generateModuleFromDescription", () => {
    it("generates all required files", () => {
      const result = generateModuleFromDescription(
        "order",
        "e-commerce orders with Stripe checkout and email confirmations",
      );

      expect(result.module).toBe("order");
      expect(result.files.length).toBeGreaterThanOrEqual(5);

      const filePaths = result.files.map((f) => f.path);
      expect(filePaths).toContain("order/order.types.ts");
      expect(filePaths).toContain("order/order.service.ts");
      expect(filePaths).toContain("order/order.controller.ts");
      expect(filePaths).toContain("order/order.test.ts");
      expect(filePaths).toContain("order/SKILL.md");
      expect(filePaths).toContain("order/index.ts");
    });

    it("includes valid TypeScript in all generated files", () => {
      const result = generateModuleFromDescription(
        "booking",
        "booking management system",
      );

      for (const file of result.files) {
        if (file.path.endsWith(".ts")) {
          // Basic validation: should not be empty
          expect(file.content.length).toBeGreaterThan(0);
          // Should not contain undefined or NaN
          expect(file.content).not.toContain("undefined");
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // Write to Disk
  // -----------------------------------------------------------------------

  describe("writeGeneratedFiles", () => {
    let projectRoot: string;

    beforeEach(() => {
      projectRoot = makeTmpDir();
    });

    afterEach(() => {
      rmSync(projectRoot, { recursive: true, force: true });
    });

    it("writes all generated files to disk", () => {
      const result = generateModuleFromDescription("order", "order management");
      const paths = writeGeneratedFiles(projectRoot, result);

      expect(paths).toHaveLength(result.files.length);
      for (const filePath of paths) {
        expect(existsSync(join(projectRoot, filePath))).toBe(true);
      }
    });

    it("creates the module directory structure", () => {
      const result = generateModuleFromDescription("order", "orders");
      writeGeneratedFiles(projectRoot, result);

      expect(
        existsSync(join(projectRoot, "src/modules/order/order.types.ts")),
      ).toBe(true);
      expect(
        existsSync(join(projectRoot, "src/modules/order/index.ts")),
      ).toBe(true);
    });

    it("file contents match generated output", () => {
      const result = generateModuleFromDescription("order", "orders");
      writeGeneratedFiles(projectRoot, result);

      const typesContent = readFileSync(
        join(projectRoot, "src/modules/order/order.types.ts"),
        "utf-8",
      );
      const expectedTypes = result.files.find(
        (f) => f.path === "order/order.types.ts",
      )!.content;
      expect(typesContent).toBe(expectedTypes);
    });
  });
});
