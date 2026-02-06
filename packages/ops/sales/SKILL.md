# @vibeonrails/sales Skill

## Purpose

The `@vibeonrails/sales` package implements a minimal CRM for AI-native businesses:

- **Contacts**: Store leads and customers with configurable stages
- **Deals**: Track sales pipeline with customizable deal stages
- **AI Qualification**: BANT-based lead qualification using AI
- **Outreach**: Cold email sequences personalized from marketing heuristics
- **CSV Import**: Bulk import contacts from CSV files

## Structure

```
packages/ops/sales/
├── src/
│   ├── types.ts             # Contact, Deal, stages, OutreachSequence types + Drizzle schemas
│   ├── service.ts           # CRUD for contacts and deals, CSV import, AI qualification
│   ├── service.test.ts      # Service tests
│   ├── outreach.ts          # Email sequences with personalization
│   ├── outreach.test.ts     # Outreach tests
│   ├── cli.ts               # CLI commands (contacts, deals, outreach, report)
│   ├── cli.test.ts          # CLI tests
│   └── index.ts             # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Managing contacts

```typescript
import { createSalesService } from "@vibeonrails/sales";

const sales = createSalesService({ db });

// Add a contact
const contact = await sales.addContact({
  email: "lead@example.com",
  name: "Jane Doe",
  company: "Acme Corp",
  stage: "lead",
});

// Import from CSV
const imported = await sales.importContactsFromCsv("/path/to/contacts.csv");

// Qualify with AI (BANT)
const qualification = await sales.qualifyContact(contact.id, { aiProvider });
```

### Managing deals

```typescript
// Create a deal
const deal = await sales.createDeal({
  title: "Acme Corp Enterprise",
  contactId: contact.id,
  value: 50000,
  stage: "qualification",
});

// Update deal stage
await sales.updateDealStage(deal.id, "proposal");
```

### Outreach sequences

```typescript
import { createOutreachEngine } from "@vibeonrails/sales";

const outreach = createOutreachEngine({ emailProvider, heuristicsPath });

const sequence = await outreach.createSequence({
  name: "Cold outreach Q1",
  contacts: [contact],
  templatePath: "/path/to/template.md",
  steps: [
    { delayDays: 0, subject: "Quick question about {{company}}" },
    { delayDays: 3, subject: "Following up on {{product}}" },
    { delayDays: 7, subject: "Last check-in" },
  ],
});
```

## Pitfalls

1. **AI qualification is optional** — Works without AI provider, just skips BANT scoring.
2. **CSV import expects headers** — First row must be column headers matching contact fields.
3. **Outreach requires marketing heuristics** — Personalization uses marketing content primitives.
4. **Deal values are in cents** — Consistent with Stripe, divide by 100 for display.
