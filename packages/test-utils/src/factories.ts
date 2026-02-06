/**
 * Test Factory Helpers
 *
 * Ship factory helpers for all common VoR data types: createUser(), createPost(),
 * createOrder(), createContact(), createDeal(). Realistic fake data with overrides.
 * Auto-detect installed modules and generate appropriate data.
 *
 * Usage:
 *   import { createUser, createOrder } from '@vibeonrails/test-utils';
 *   const user = createUser({ email: 'alice@example.com' });
 *   const order = createOrder({ userId: user.id, total: 99.99 });
 */

// ---------------------------------------------------------------------------
// Counters (reset between tests via resetFactories())
// ---------------------------------------------------------------------------

let counters = {
  user: 0,
  post: 0,
  order: 0,
  contact: 0,
  deal: 0,
  product: 0,
  comment: 0,
  ticket: 0,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Factory user record.
 */
export interface FactoryUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: "user" | "admin" | "moderator";
  readonly isActive: boolean;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Factory post record.
 */
export interface FactoryPost {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly content: string;
  readonly excerpt: string;
  readonly published: boolean;
  readonly authorId: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Factory order record (e-commerce).
 */
export interface FactoryOrder {
  readonly id: string;
  readonly userId: string;
  readonly status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  readonly items: readonly FactoryOrderItem[];
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly currency: string;
  readonly shippingAddress: FactoryAddress | null;
  readonly stripePaymentIntentId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Factory order item.
 */
export interface FactoryOrderItem {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

/**
 * Factory address.
 */
export interface FactoryAddress {
  readonly line1: string;
  readonly line2: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

/**
 * Factory contact record (CRM).
 */
export interface FactoryContact {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly phone: string;
  readonly stage: "lead" | "qualified" | "customer" | "churned";
  readonly source: string;
  readonly tags: readonly string[];
  readonly notes: string;
  readonly lastContactedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Factory deal record (CRM pipeline).
 */
export interface FactoryDeal {
  readonly id: string;
  readonly title: string;
  readonly contactId: string;
  readonly stage: "discovery" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  readonly value: number;
  readonly currency: string;
  readonly probability: number;
  readonly expectedCloseDate: string;
  readonly assignedTo: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Factory product record.
 */
export interface FactoryProduct {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly inventory: number;
  readonly isActive: boolean;
  readonly createdAt: string;
}

/**
 * Factory comment record.
 */
export interface FactoryComment {
  readonly id: string;
  readonly postId: string;
  readonly authorId: string;
  readonly content: string;
  readonly createdAt: string;
}

/**
 * Factory ticket record (support).
 */
export interface FactoryTicket {
  readonly id: string;
  readonly subject: string;
  readonly description: string;
  readonly status: "open" | "in-progress" | "waiting" | "resolved" | "closed";
  readonly priority: "low" | "medium" | "high" | "urgent";
  readonly userId: string;
  readonly assignedTo: string | null;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString();
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/**
 * Create a test user with realistic defaults.
 */
export function createUser(
  overrides: Partial<FactoryUser> = {},
): FactoryUser {
  counters.user++;
  const n = counters.user;
  const now = timestamp();
  return {
    id: `user-${n}`,
    email: `user${n}@example.com`,
    name: `Test User ${n}`,
    role: "user",
    isActive: true,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test post with realistic defaults.
 */
export function createPost(
  overrides: Partial<FactoryPost> = {},
): FactoryPost {
  counters.post++;
  const n = counters.post;
  const title = overrides.title ?? `Test Post ${n}`;
  const now = timestamp();
  return {
    id: `post-${n}`,
    title,
    slug: toSlug(title),
    content: `This is the content for test post ${n}. It covers important topics.`,
    excerpt: `Excerpt for test post ${n}`,
    published: false,
    authorId: "user-1",
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test order with realistic defaults.
 */
export function createOrder(
  overrides: Partial<FactoryOrder> = {},
): FactoryOrder {
  counters.order++;
  const n = counters.order;
  const now = timestamp();

  const defaultItems: FactoryOrderItem[] = [
    {
      productId: `product-${n}`,
      name: `Product ${n}`,
      quantity: 1,
      unitPrice: 29.99,
    },
  ];

  const items = overrides.items ?? defaultItems;
  const subtotal =
    overrides.subtotal ??
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = overrides.tax ?? Math.round(subtotal * 0.1 * 100) / 100;
  const total =
    overrides.total ?? Math.round((subtotal + tax) * 100) / 100;

  return {
    id: `order-${n}`,
    userId: "user-1",
    status: "pending",
    items,
    subtotal,
    tax,
    total,
    currency: "usd",
    shippingAddress: null,
    stripePaymentIntentId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test contact with realistic defaults.
 */
export function createContact(
  overrides: Partial<FactoryContact> = {},
): FactoryContact {
  counters.contact++;
  const n = counters.contact;
  const now = timestamp();
  return {
    id: `contact-${n}`,
    name: `Contact ${n}`,
    email: `contact${n}@example.com`,
    company: `Company ${n} Inc.`,
    phone: `+1555000${String(n).padStart(4, "0")}`,
    stage: "lead",
    source: "website",
    tags: [],
    notes: "",
    lastContactedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test deal with realistic defaults.
 */
export function createDeal(
  overrides: Partial<FactoryDeal> = {},
): FactoryDeal {
  counters.deal++;
  const n = counters.deal;
  const now = timestamp();

  // Default expected close date is 30 days from now
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 30);

  return {
    id: `deal-${n}`,
    title: `Deal ${n} - Enterprise License`,
    contactId: `contact-${n}`,
    stage: "discovery",
    value: 5000 * n,
    currency: "usd",
    probability: 25,
    expectedCloseDate: closeDate.toISOString().split("T")[0]!,
    assignedTo: "user-1",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test product with realistic defaults.
 */
export function createProduct(
  overrides: Partial<FactoryProduct> = {},
): FactoryProduct {
  counters.product++;
  const n = counters.product;
  const name = overrides.name ?? `Product ${n}`;
  return {
    id: `product-${n}`,
    name,
    slug: toSlug(name),
    description: `Description for ${name}`,
    price: 29.99,
    currency: "usd",
    inventory: 100,
    isActive: true,
    createdAt: timestamp(),
    ...overrides,
  };
}

/**
 * Create a test comment with realistic defaults.
 */
export function createComment(
  overrides: Partial<FactoryComment> = {},
): FactoryComment {
  counters.comment++;
  const n = counters.comment;
  return {
    id: `comment-${n}`,
    postId: "post-1",
    authorId: "user-1",
    content: `This is test comment ${n}. Great post!`,
    createdAt: timestamp(),
    ...overrides,
  };
}

/**
 * Create a test ticket with realistic defaults.
 */
export function createTicket(
  overrides: Partial<FactoryTicket> = {},
): FactoryTicket {
  counters.ticket++;
  const n = counters.ticket;
  const now = timestamp();
  return {
    id: `ticket-${n}`,
    subject: `Issue ${n}: Something needs attention`,
    description: `Detailed description for ticket ${n}`,
    status: "open",
    priority: "medium",
    userId: "user-1",
    assignedTo: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Batch Factories
// ---------------------------------------------------------------------------

/**
 * Create multiple records at once.
 *
 * Usage:
 *   const users = createMany(createUser, 5, { role: 'admin' });
 */
export function createMany<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overrides: Partial<T> = {},
): readonly T[] {
  return Array.from({ length: count }, () => factory(overrides));
}

// ---------------------------------------------------------------------------
// Module Detection
// ---------------------------------------------------------------------------

/**
 * Detect which VoR modules are installed in a project.
 *
 * Reads .vibe/modules.json manifest to determine available factories.
 */
export function detectInstalledModules(
  projectRoot: string,
): readonly string[] {
  const { existsSync, readFileSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");

  const manifestPath = join(projectRoot, ".vibe", "modules.json");
  if (!existsSync(manifestPath)) {
    return [];
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      modules: Record<string, unknown>;
    };
    return Object.keys(manifest.modules);
  } catch {
    return [];
  }
}

/**
 * Get available factory functions based on installed modules.
 *
 * Always available: createUser, createPost, createComment
 * With payments/admin: createOrder, createProduct
 * With sales: createContact, createDeal
 * With support: createTicket
 */
export function getAvailableFactories(
  installedModules: readonly string[],
): readonly string[] {
  const factories = ["createUser", "createPost", "createComment"];

  if (
    installedModules.includes("payments") ||
    installedModules.includes("admin")
  ) {
    factories.push("createOrder", "createProduct");
  }

  if (installedModules.includes("sales")) {
    factories.push("createContact", "createDeal");
  }

  if (
    installedModules.includes("support-chat") ||
    installedModules.includes("support-feedback")
  ) {
    factories.push("createTicket");
  }

  return factories;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all factory counters. Call in beforeEach().
 */
export function resetFactories(): void {
  counters = {
    user: 0,
    post: 0,
    order: 0,
    contact: 0,
    deal: 0,
    product: 0,
    comment: 0,
    ticket: 0,
  };
}
