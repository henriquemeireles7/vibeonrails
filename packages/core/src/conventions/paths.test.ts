/**
 * Deterministic Path Conventions — Tests
 *
 * Tests all path patterns: modules, content types, config, manifests.
 * Ensures deterministic and predictable output.
 */

import { describe, it, expect } from "vitest";
import { pathFor, toKebabCase, toPascalCase } from "./paths.js";

describe("toKebabCase", () => {
  it("should convert PascalCase to kebab-case", () => {
    expect(toKebabCase("OrderItem")).toBe("order-item");
  });

  it("should convert camelCase to kebab-case", () => {
    expect(toKebabCase("orderItem")).toBe("order-item");
  });

  it("should handle spaces", () => {
    expect(toKebabCase("order item")).toBe("order-item");
  });

  it("should handle already kebab-case", () => {
    expect(toKebabCase("order-item")).toBe("order-item");
  });

  it("should handle single word", () => {
    expect(toKebabCase("order")).toBe("order");
  });
});

describe("toPascalCase", () => {
  it("should convert kebab-case to PascalCase", () => {
    expect(toPascalCase("order-item")).toBe("OrderItem");
  });

  it("should convert spaces to PascalCase", () => {
    expect(toPascalCase("order item")).toBe("OrderItem");
  });

  it("should handle single word", () => {
    expect(toPascalCase("button")).toBe("Button");
  });

  it("should handle underscore separation", () => {
    expect(toPascalCase("data_table")).toBe("DataTable");
  });
});

describe("pathFor - module", () => {
  it("should generate module index path", () => {
    expect(pathFor("module", "order")).toBe("src/modules/order/index.ts");
  });

  it("should generate module service path", () => {
    expect(pathFor("module", "order", "service")).toBe(
      "src/modules/order/order.service.ts",
    );
  });

  it("should generate module types path", () => {
    expect(pathFor("module", "order", "types")).toBe(
      "src/modules/order/order.types.ts",
    );
  });

  it("should generate module controller path", () => {
    expect(pathFor("module", "order", "controller")).toBe(
      "src/modules/order/order.controller.ts",
    );
  });

  it("should generate module test path", () => {
    expect(pathFor("module", "order", "test")).toBe(
      "src/modules/order/order.test.ts",
    );
  });

  it("should generate module schema path", () => {
    expect(pathFor("module", "order", "schema")).toBe(
      "src/modules/order/order.schema.ts",
    );
  });

  it("should generate module SKILL.md path", () => {
    expect(pathFor("module", "order", "skill")).toBe(
      "src/modules/order/SKILL.md",
    );
  });

  it("should handle PascalCase names", () => {
    expect(pathFor("module", "OrderItem", "service")).toBe(
      "src/modules/order-item/order-item.service.ts",
    );
  });
});

describe("pathFor - component", () => {
  it("should generate component path with PascalCase", () => {
    expect(pathFor("component", "Button")).toBe(
      "src/web/components/Button/Button.tsx",
    );
  });

  it("should convert kebab-case to PascalCase", () => {
    expect(pathFor("component", "data-table")).toBe(
      "src/web/components/DataTable/DataTable.tsx",
    );
  });
});

describe("pathFor - heuristic", () => {
  it("should generate hook heuristic path", () => {
    expect(pathFor("heuristic", "hook", "pain")).toBe(
      "content/marketing/heuristics/hooks/pain.md",
    );
  });

  it("should generate client heuristic path", () => {
    expect(pathFor("heuristic", "client", "indie-hacker")).toBe(
      "content/marketing/heuristics/clients/indie-hacker.md",
    );
  });

  it("should generate product heuristic path", () => {
    expect(pathFor("heuristic", "product", "vor-framework")).toBe(
      "content/marketing/heuristics/products/vor-framework.md",
    );
  });

  it("should generate branding heuristic path", () => {
    expect(pathFor("heuristic", "branding", "voice")).toBe(
      "content/marketing/heuristics/brandings/voice.md",
    );
  });
});

describe("pathFor - content", () => {
  it("should generate blog post path", () => {
    expect(pathFor("content", "blog", "my-first-post")).toBe(
      "content/blog/my-first-post.md",
    );
  });

  it("should generate help article path", () => {
    expect(pathFor("content", "help", "getting-started")).toBe(
      "content/help/getting-started.md",
    );
  });

  it("should generate changelog path", () => {
    expect(pathFor("content", "changelog", "v2-release")).toBe(
      "content/changelog/v2-release.md",
    );
  });
});

describe("pathFor - config", () => {
  it("should generate config file path", () => {
    expect(pathFor("config", "security")).toBe("config/security.ts");
  });
});

describe("pathFor - manifest", () => {
  it("should generate manifest file path", () => {
    expect(pathFor("manifest", "modules")).toBe(".vibe/modules.json");
  });
});

describe("pathFor - skill", () => {
  it("should generate SKILL.md path", () => {
    expect(pathFor("skill", "src/modules/order")).toBe(
      "src/modules/order/SKILL.md",
    );
  });
});

describe("pathFor - test", () => {
  it("should generate test file path", () => {
    expect(pathFor("test", "src/modules/order/order.service.ts")).toBe(
      "src/modules/order/order.service.test.ts",
    );
  });
});

describe("pathFor - page", () => {
  it("should generate page path", () => {
    expect(pathFor("page", "dashboard")).toBe("src/web/pages/Dashboard.tsx");
  });
});

describe("pathFor - channel", () => {
  it("should generate channel drafts path", () => {
    expect(pathFor("channel", "twitter", "drafts")).toBe(
      "content/marketing/channels/twitter/drafts",
    );
  });

  it("should generate channel posted path", () => {
    expect(pathFor("channel", "twitter", "posted")).toBe(
      "content/marketing/channels/twitter/posted",
    );
  });
});

describe("pathFor - task", () => {
  it("should generate task path in backlog", () => {
    expect(pathFor("task", "add-dark-mode", "backlog")).toBe(
      ".plan/tasks/backlog/add-dark-mode.md",
    );
  });

  it("should generate bug task path", () => {
    expect(pathFor("task", "fix-login", "current")).toBe(
      ".plan/tasks/current/fix-login.md",
    );
  });
});

describe("pathFor - email", () => {
  it("should generate email template path", () => {
    expect(pathFor("email", "welcome")).toBe("content/emails/welcome.md");
  });
});

describe("pathFor determinism", () => {
  it("should always return the same path for the same input", () => {
    const path1 = pathFor("module", "order", "service");
    const path2 = pathFor("module", "order", "service");
    expect(path1).toBe(path2);
  });

  it("should return different paths for different inputs", () => {
    const path1 = pathFor("module", "order", "service");
    const path2 = pathFor("module", "user", "service");
    expect(path1).not.toBe(path2);
  });
});
