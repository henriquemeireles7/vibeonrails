---
name: vibe-marketing
description: Manage marketing content pipeline — heuristics, content generation, channel posting
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - marketing
  - content
  - social-media
---

# Vibe on Rails Marketing Skill

You can manage the marketing content pipeline: heuristics, content generation, and channel posting.

## Available Commands

### Heuristics Management

- `npx vibe marketing heuristics list` — List all heuristics by type
- `npx vibe marketing heuristics list --type <type>` — Filter by type (hook, client, product, story, concept, branding, cta)
- `npx vibe marketing heuristics create <type> <name>` — Create a new heuristic file

### Content Generation

- `npx vibe marketing generate <channel>` — Generate content for a channel (twitter, bluesky)
  - `--hook <id>` — Select a hook heuristic
  - `--client <id>` — Select a client heuristic
  - `--product <id>` — Select a product heuristic
  - `--story <id>` — Select a story heuristic
  - `--concept <id>` — Select a concept heuristic
  - `--cta <id>` — Select a CTA heuristic
  - `--branding <id>` — Select a branding heuristic
  - `--topic "free text"` — Additional context

### Channel Posting

- `npx vibe marketing post <channel> [file]` — Post content (no file = oldest draft)
- `npx vibe marketing autopilot <channel>` — Generate and post without review
  - `--count <n>` — Number of posts
  - `--interval <duration>` — Time between posts (e.g., "2h")
- `npx vibe marketing schedule <channel> <file> --at <datetime>` — Schedule a post

### Pipeline Monitoring

- `npx vibe marketing drafts [channel]` — List pending drafts
- `npx vibe marketing posted [channel]` — List posted content
- `npx vibe marketing stats [channel]` — Pipeline statistics

## Workflow

1. **Draft Review**: When content is generated, post it to the #content-review channel for approval.
2. **Autopilot**: When explicitly enabled, generate and post without review.
3. **Scheduling**: Schedule posts for optimal times per channel.

## Safety Rules

1. **Default to draft mode**: Always generate as draft unless autopilot is explicitly requested.
2. **Confirm autopilot**: Before running autopilot, confirm the count and interval with the user.
3. **Report post URLs**: After posting, always share the post URL.
4. **Track heuristic usage**: Note which heuristics were used in generation.

## Examples

User: "Generate a tweet about our new feature"
Action: Run `npx vibe marketing generate twitter --topic "new feature announcement"`, then share the draft.

User: "Post the latest draft to Twitter"
Action: Run `npx vibe marketing post twitter` and report the post URL.

User: "How many drafts do we have?"
Action: Run `npx vibe marketing drafts` and report the count per channel.
