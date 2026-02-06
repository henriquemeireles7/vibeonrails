/**
 * Test Factory Helpers — Tests
 *
 * Tests for factory functions:
 * - Data generation with correct defaults
 * - Override merging
 * - Module detection
 * - Type safety
 * - Batch creation
 * - Counter incrementing and reset
 */

import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  createUser,
  createPost,
  createOrder,
  createContact,
  createDeal,
  createProduct,
  createComment,
  createTicket,
  createMany,
  resetFactories,
  detectInstalledModules,
  getAvailableFactories,
} from "./factories.js";

// ---------------------------------------------------------------------------
// Reset counters before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetFactories();
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe("createUser", () => {
  it("should create a user with defaults", () => {
    const user = createUser();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("user1@example.com");
    expect(user.name).toBe("Test User 1");
    expect(user.role).toBe("user");
    expect(user.isActive).toBe(true);
    expect(user.emailVerified).toBe(true);
    expect(user.createdAt).toBeTruthy();
    expect(user.updatedAt).toBeTruthy();
  });

  it("should increment IDs", () => {
    const user1 = createUser();
    const user2 = createUser();
    expect(user1.id).toBe("user-1");
    expect(user2.id).toBe("user-2");
    expect(user1.email).not.toBe(user2.email);
  });

  it("should accept overrides", () => {
    const user = createUser({ email: "alice@test.com", role: "admin" });
    expect(user.email).toBe("alice@test.com");
    expect(user.role).toBe("admin");
    expect(user.name).toBe("Test User 1"); // default preserved
  });
});

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

describe("createPost", () => {
  it("should create a post with defaults", () => {
    const post = createPost();
    expect(post.id).toBe("post-1");
    expect(post.title).toBe("Test Post 1");
    expect(post.slug).toBe("test-post-1");
    expect(post.published).toBe(false);
    expect(post.authorId).toBe("user-1");
    expect(post.tags).toEqual([]);
  });

  it("should generate slug from title", () => {
    const post = createPost({ title: "My Great Blog Post!" });
    expect(post.slug).toBe("my-great-blog-post-");
  });

  it("should accept overrides", () => {
    const post = createPost({ published: true, tags: ["tech", "ai"] });
    expect(post.published).toBe(true);
    expect(post.tags).toEqual(["tech", "ai"]);
  });
});

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

describe("createOrder", () => {
  it("should create an order with defaults", () => {
    const order = createOrder();
    expect(order.id).toBe("order-1");
    expect(order.userId).toBe("user-1");
    expect(order.status).toBe("pending");
    expect(order.items).toHaveLength(1);
    expect(order.currency).toBe("usd");
    expect(order.shippingAddress).toBeNull();
    expect(order.stripePaymentIntentId).toBeNull();
  });

  it("should auto-calculate totals from items", () => {
    const order = createOrder({
      items: [
        { productId: "p1", name: "Widget", quantity: 2, unitPrice: 10 },
        { productId: "p2", name: "Gadget", quantity: 1, unitPrice: 25 },
      ],
    });
    expect(order.subtotal).toBe(45); // 2*10 + 1*25
    expect(order.tax).toBe(4.5); // 10%
    expect(order.total).toBe(49.5);
  });

  it("should accept explicit totals", () => {
    const order = createOrder({ subtotal: 100, tax: 15, total: 115 });
    expect(order.subtotal).toBe(100);
    expect(order.tax).toBe(15);
    expect(order.total).toBe(115);
  });

  it("should accept overrides", () => {
    const order = createOrder({
      status: "paid",
      stripePaymentIntentId: "pi_test123",
    });
    expect(order.status).toBe("paid");
    expect(order.stripePaymentIntentId).toBe("pi_test123");
  });
});

// ---------------------------------------------------------------------------
// createContact
// ---------------------------------------------------------------------------

describe("createContact", () => {
  it("should create a contact with defaults", () => {
    const contact = createContact();
    expect(contact.id).toBe("contact-1");
    expect(contact.name).toBe("Contact 1");
    expect(contact.email).toBe("contact1@example.com");
    expect(contact.company).toBe("Company 1 Inc.");
    expect(contact.stage).toBe("lead");
    expect(contact.source).toBe("website");
    expect(contact.lastContactedAt).toBeNull();
  });

  it("should accept overrides", () => {
    const contact = createContact({
      stage: "customer",
      company: "ACME Corp",
      tags: ["enterprise", "vip"],
    });
    expect(contact.stage).toBe("customer");
    expect(contact.company).toBe("ACME Corp");
    expect(contact.tags).toEqual(["enterprise", "vip"]);
  });

  it("should generate realistic phone numbers", () => {
    const contact = createContact();
    expect(contact.phone).toMatch(/^\+1555\d{7}$/);
  });
});

// ---------------------------------------------------------------------------
// createDeal
// ---------------------------------------------------------------------------

describe("createDeal", () => {
  it("should create a deal with defaults", () => {
    const deal = createDeal();
    expect(deal.id).toBe("deal-1");
    expect(deal.title).toContain("Deal 1");
    expect(deal.stage).toBe("discovery");
    expect(deal.value).toBe(5000);
    expect(deal.currency).toBe("usd");
    expect(deal.probability).toBe(25);
    expect(deal.assignedTo).toBe("user-1");
  });

  it("should generate future expected close date", () => {
    const deal = createDeal();
    const closeDate = new Date(deal.expectedCloseDate);
    const today = new Date();
    expect(closeDate.getTime()).toBeGreaterThan(today.getTime());
  });

  it("should accept overrides", () => {
    const deal = createDeal({
      stage: "closed-won",
      value: 50000,
      probability: 100,
    });
    expect(deal.stage).toBe("closed-won");
    expect(deal.value).toBe(50000);
    expect(deal.probability).toBe(100);
  });

  it("should scale value with counter", () => {
    const deal1 = createDeal();
    const deal2 = createDeal();
    expect(deal1.value).toBe(5000);
    expect(deal2.value).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------

describe("createProduct", () => {
  it("should create a product with defaults", () => {
    const product = createProduct();
    expect(product.id).toBe("product-1");
    expect(product.name).toBe("Product 1");
    expect(product.slug).toBe("product-1");
    expect(product.price).toBe(29.99);
    expect(product.currency).toBe("usd");
    expect(product.inventory).toBe(100);
    expect(product.isActive).toBe(true);
  });

  it("should generate slug from name", () => {
    const product = createProduct({ name: "Super Widget Pro" });
    expect(product.slug).toBe("super-widget-pro");
  });
});

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------

describe("createComment", () => {
  it("should create a comment with defaults", () => {
    const comment = createComment();
    expect(comment.id).toBe("comment-1");
    expect(comment.postId).toBe("post-1");
    expect(comment.authorId).toBe("user-1");
    expect(comment.content).toContain("comment 1");
  });

  it("should accept overrides", () => {
    const comment = createComment({
      postId: "post-42",
      content: "Love this!",
    });
    expect(comment.postId).toBe("post-42");
    expect(comment.content).toBe("Love this!");
  });
});

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------

describe("createTicket", () => {
  it("should create a ticket with defaults", () => {
    const ticket = createTicket();
    expect(ticket.id).toBe("ticket-1");
    expect(ticket.status).toBe("open");
    expect(ticket.priority).toBe("medium");
    expect(ticket.assignedTo).toBeNull();
    expect(ticket.tags).toEqual([]);
  });

  it("should accept overrides", () => {
    const ticket = createTicket({
      priority: "urgent",
      status: "in-progress",
      assignedTo: "user-5",
    });
    expect(ticket.priority).toBe("urgent");
    expect(ticket.status).toBe("in-progress");
    expect(ticket.assignedTo).toBe("user-5");
  });
});

// ---------------------------------------------------------------------------
// createMany
// ---------------------------------------------------------------------------

describe("createMany", () => {
  it("should create multiple records", () => {
    const users = createMany(createUser, 5);
    expect(users).toHaveLength(5);
    expect(users[0]!.id).toBe("user-1");
    expect(users[4]!.id).toBe("user-5");
  });

  it("should apply overrides to all records", () => {
    const users = createMany(createUser, 3, { role: "admin" });
    for (const user of users) {
      expect(user.role).toBe("admin");
    }
  });

  it("should work with any factory", () => {
    const orders = createMany(createOrder, 2, { status: "paid" });
    expect(orders).toHaveLength(2);
    expect(orders[0]!.status).toBe("paid");
    expect(orders[1]!.status).toBe("paid");
  });
});

// ---------------------------------------------------------------------------
// resetFactories
// ---------------------------------------------------------------------------

describe("resetFactories", () => {
  it("should reset all counters", () => {
    createUser();
    createPost();
    createOrder();
    resetFactories();

    expect(createUser().id).toBe("user-1");
    expect(createPost().id).toBe("post-1");
    expect(createOrder().id).toBe("order-1");
  });
});

// ---------------------------------------------------------------------------
// Module Detection
// ---------------------------------------------------------------------------

describe("detectInstalledModules", () => {
  const testDir = join(tmpdir(), "vibe-factory-modules-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return empty when no manifest exists", () => {
    const modules = detectInstalledModules(testDir);
    expect(modules).toEqual([]);
  });

  it("should return installed module names", () => {
    mkdirSync(join(testDir, ".vibe"), { recursive: true });
    writeFileSync(
      join(testDir, ".vibe", "modules.json"),
      JSON.stringify({
        version: "1.0",
        modules: {
          marketing: { name: "marketing" },
          payments: { name: "payments" },
        },
      }),
    );
    const modules = detectInstalledModules(testDir);
    expect(modules).toEqual(["marketing", "payments"]);
  });

  it("should handle corrupted manifest", () => {
    mkdirSync(join(testDir, ".vibe"), { recursive: true });
    writeFileSync(join(testDir, ".vibe", "modules.json"), "not json");
    const modules = detectInstalledModules(testDir);
    expect(modules).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAvailableFactories
// ---------------------------------------------------------------------------

describe("getAvailableFactories", () => {
  it("should always include base factories", () => {
    const factories = getAvailableFactories([]);
    expect(factories).toContain("createUser");
    expect(factories).toContain("createPost");
    expect(factories).toContain("createComment");
  });

  it("should include order/product factories when payments is installed", () => {
    const factories = getAvailableFactories(["payments"]);
    expect(factories).toContain("createOrder");
    expect(factories).toContain("createProduct");
  });

  it("should include order/product factories when admin is installed", () => {
    const factories = getAvailableFactories(["admin"]);
    expect(factories).toContain("createOrder");
    expect(factories).toContain("createProduct");
  });

  it("should include contact/deal factories when sales is installed", () => {
    const factories = getAvailableFactories(["sales"]);
    expect(factories).toContain("createContact");
    expect(factories).toContain("createDeal");
  });

  it("should include ticket factory when support-chat is installed", () => {
    const factories = getAvailableFactories(["support-chat"]);
    expect(factories).toContain("createTicket");
  });

  it("should include ticket factory when support-feedback is installed", () => {
    const factories = getAvailableFactories(["support-feedback"]);
    expect(factories).toContain("createTicket");
  });

  it("should include all factories when all modules are installed", () => {
    const factories = getAvailableFactories([
      "payments",
      "sales",
      "support-chat",
    ]);
    expect(factories).toContain("createUser");
    expect(factories).toContain("createPost");
    expect(factories).toContain("createComment");
    expect(factories).toContain("createOrder");
    expect(factories).toContain("createProduct");
    expect(factories).toContain("createContact");
    expect(factories).toContain("createDeal");
    expect(factories).toContain("createTicket");
  });
});
