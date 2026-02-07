# VibeonRails Principles

> Internal decision compass. Not marketing, not storytelling.
> Every feature, every convention, every line of code should trace back to this document.

---

## Identity

VibeonRails is a TypeScript framework where AI agents are the primary developer and humans are the director.

We exist to make AI agents produce production-grade businesses, not demos.

---

## The Two-Layer Architecture

Every feature in VibeonRails lives in one of two layers:

### Template Layer (What the AI/User sees and edits)

Code that gets **copied** into the user's project. The user owns it and can modify it.
This is what AI would normally generate -- except ours is better, tested, and production-ready.

Examples: auth module, user module, payments service, billing controller.

### Invisible Layer (What the framework handles automatically)

Code that lives inside `@vibeonrails/*` packages and is **imported**, never copied.
This is what AI would NOT generate on its own -- security hardening, idempotency,
state machines, error sanitization, rate limiting.

Examples: Argon2 password hashing, CSRF protection, webhook idempotency,
subscription state machine, structured logging, error message sanitization.

### The Decision Rule

When adding any feature, ask: **"Would an AI agent writing this from scratch include this?"**

- If **YES**: it goes in the template layer (so ours is better than what AI would write).
- If **NO**: it goes in the invisible layer (so it happens automatically without anyone asking).

Both layers ship together. The template imports from the invisible layer.
The user gets the benefits of both without knowing the invisible layer exists.

---

## The Seven Axioms

### 1. AI is the Developer, Human is the Director

Every file name, every folder structure, every convention is optimized for AI comprehension.
The human says "add payments." The AI executes using VibeonRails tools.

If an AI agent can't figure out how to use a feature by reading the project files,
the feature is broken -- regardless of how good the documentation website is.

### 2. Convention is Discovery

If the AI has to search for something, we failed.

- Every module follows the same structure: types, service, controller, test.
- Every package has a SKILL.md in the same location.
- Every CLI command follows the same pattern.
- File names match module names. Import paths match folder paths.

Predictable locations. Predictable names. Predictable patterns.
Convention eliminates the need for discovery.

### 3. Basic = Template, Advanced = Invisible

Templates are the starting point -- what AI would generate, but better.
The invisible layer is what AI would never generate on its own.

The user's auth module calls `hashPassword()`. They don't know it uses Argon2
with optimal parameters. They don't need to know. That's the invisible layer.

The user's payments module calls `handleWebhook()`. They don't know it has
idempotency protection against duplicate Stripe events. They don't need to know.

### 4. The SKILL.md Contract

Every folder has a SKILL.md. The project's root AI instructions teach agents
to look for them. This is the bridge between "powerful tools exist" and
"AI knows they exist."

Without this bridge, every package we build is invisible to its primary user.

The contract:
- Framework packages: SKILL.md in the package root explains what's available.
- User project: SKILL.md in the project root lists all available packages.
- Generated modules: SKILL.md in each module folder explains its patterns.
- The root .cursorrules / AGENTS.md tells AI to read SKILL.md files.

### 5. Production by Default

There is no "demo mode." Everything generated is production-grade.

- Security features are always on. There is no flag to disable CSRF.
- Error messages never leak internal details. Not in dev, not in prod.
- Passwords use Argon2, not bcrypt. Tokens use jose, not jsonwebtoken.
- Validation runs on every input. Not optional. Not configurable.

If a user deploys what we generate on day one, it should survive day one thousand.

### 6. Interview Over Configuration

Don't ask users to write configuration files. Ask them questions, generate the config.

Bad: "Create a `stripe.config.ts` with your plan definitions."
Good: "Run `vibe ask` and answer: How many plans do you have? What are their names and prices?"

The interview generates the configuration file. The user never writes YAML, TOML,
or TypeScript config objects. They answer questions in natural language.

### 7. Full Business, Not Just Code

Marketing, sales, support, finance are not add-ons. They are core to the mission.

"Build, run, and grow companies" means:
- **Build**: auth, database, API, frontend, payments (the code).
- **Run**: logging, monitoring, health checks, deployments (the operations).
- **Grow**: marketing, sales, support, finance (the business).

A framework that only handles "build" is a coding tool.
A framework that handles all three is a business operating system.

---

## The Discoverability Contract

Three layers ensure AI agents find and use framework features:

### Layer 1: Project-Level AI Instructions

When a user creates a project with `create-vibe`, the generated project includes
a `.cursorrules` and `SKILL.md` that tell AI agents:

- This project uses VibeonRails.
- Before writing code for auth, payments, email, logging, or any common feature,
  check if @vibeonrails packages already provide it.
- Read SKILL.md files in module folders for usage patterns.
- Use `vibe add <module>` to install optional features.

This is the FIRST thing any AI agent reads when opening the project.
If this layer is missing, all other layers are invisible.

### Layer 2: Module-Level SKILL.md

Every installed module has a SKILL.md with:
- What the module does (one sentence).
- File structure.
- Import examples with real code.
- Common patterns and pitfalls.

These are discovered because Layer 1 told the AI to look for them.

### Layer 3: Generated Starter Code

Every `vibe add <module>` generates a working module with:
- `<name>.service.ts` -- working service with example usage of the package.
- `<name>.controller.ts` -- tRPC endpoints wired up.
- `<name>.types.ts` -- Zod schemas.
- `<name>.test.ts` -- tests that pass.
- `SKILL.md` -- AI instructions.

The AI sees REAL code in the project and extends it.
It never starts from scratch.

---

## Decision Framework

When adding a new feature to VibeonRails, ask these questions in order:

### 1. Would a user ask for this?

Example: "add payments", "add marketing", "add admin panel."

If yes, it needs a `vibe add` command with a full template (service, controller,
types, test, SKILL.md).

### 2. Would AI generate this correctly on its own?

Example: AI would NOT generate webhook idempotency, subscription state machines,
or Argon2 with optimal parameters.

If no, it must be in the invisible layer (framework core packages).

### 3. Is this the same for every business?

Example: Auth is the same for everyone. Payment plans vary per business.

If yes, it goes in the base template (`create-vibe`).
If no, it goes in `vibe add` with customizable starter code.

### 4. Can the user break it by modifying it?

Example: If the user edits the CSRF middleware, they could break security.

If yes, it should be in the framework (imported from @vibeonrails, not copied).
If no, it can be in the template (copied into the user's project, editable).

---

## What We Do NOT Do

- We do not expose complexity. If it's complex, we hide it behind a simple function.
- We do not require configuration for security features. They are always on.
- We do not generate code that only works in development.
- We do not compete on feature count. We compete on "AI builds it right the first time."
- We do not ask users to read documentation to get started. The code teaches itself.
- We do not build features that require a human developer to understand. If AI can't use it, we redesign it.
