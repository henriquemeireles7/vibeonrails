# @vibeonrails/companion Skill

## Purpose

The `@vibeonrails/companion` package provides OpenClaw skills that turn any OpenClaw instance into a VoR-aware autonomous business operator. It is NOT a Discord bot — it is a skill package for OpenClaw plus a setup CLI that automates the connection.

## Structure

```
packages/companion/
├── skills/
│   ├── vibe-project/         # Core: run any vibe CLI command
│   │   └── skill.md
│   ├── vibe-marketing/       # Marketing-specific commands
│   │   └── skill.md
│   ├── vibe-support/         # Support-specific commands
│   │   └── skill.md
│   ├── vibe-finance/         # Finance-specific commands
│   │   └── skill.md
│   └── vibe-analytics/       # Analytics-specific commands
│       └── skill.md
├── personality/
│   └── agent.md              # Default personality template
├── src/
│   ├── types.ts              # Companion types (config, skill metadata, status)
│   ├── setup.ts              # `npx vibe companion setup discord` flow
│   ├── setup.test.ts         # Setup tests
│   ├── cli.ts                # `npx vibe companion status/config/logs`
│   ├── cli.test.ts           # CLI tests
│   └── index.ts              # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Architecture

OpenClaw is the most popular open-source AI agent project. VoR leverages OpenClaw as the companion runtime and contributes VoR-specific skills.

The setup CLI:

1. Checks if OpenClaw is reachable
2. Runs compatibility check (min_openclaw_version + skill_format_version)
3. Installs VoR skills into OpenClaw
4. Configures Discord channel mapping
5. Sets personality from content/brand/agent.md
6. Names the companion
7. Tests connection

## Patterns

### Setting up a companion

```typescript
import { setupCompanion } from "@vibeonrails/companion";

await setupCompanion({
  platform: "discord",
  openclawUrl: "http://localhost:3100",
  projectRoot: process.cwd(),
  name: "MyBot",
});
```

### Checking companion status

```typescript
import { getCompanionStatus } from "@vibeonrails/companion";

const status = await getCompanionStatus({
  openclawUrl: "http://localhost:3100",
  projectRoot: process.cwd(),
});
// { connected: true, name: 'MyBot', skills: [...], uptime: 3600 }
```

## Pitfalls

1. **OpenClaw must be running** — The companion requires a running OpenClaw instance. The setup CLI validates this.
2. **Skills are version-pinned** — Each skill has min_openclaw_version. Incompatible versions trigger warnings.
3. **Personality is per-project** — Configured via content/brand/agent.md, not globally.
4. **Discord is the default, not the only option** — OpenClaw supports many channels. VoR recommends Discord.
