# Content System Skill

## Purpose

The content system manages all user-facing text: emails, website copy, app copy, and brand guidelines. Content is kept separate from code for easy editing and localization.

## Structure

```
content/
├── locales/
│   └── en/
│       ├── emails/         # Transactional email templates (Markdown + frontmatter)
│       │   ├── welcome.md
│       │   ├── password-reset.md
│       │   ├── email-verify.md
│       │   └── invoice.md
│       ├── website/        # Marketing pages
│       │   ├── landing.md
│       │   ├── pricing.md
│       │   └── about.md
│       └── app/            # In-app copy
│           ├── onboarding.md
│           └── errors.md
├── brand/
│   ├── voice.md            # Brand voice guidelines
│   └── terminology.md      # Product terminology glossary
└── SKILL.md
```

## Patterns

### Email templates

Templates use Markdown with YAML frontmatter for metadata. Variables use `{{variable}}` syntax.

```markdown
---
subject: "Welcome to {{appName}}!"
---

# Welcome, {{name}}!
```

### Adding a new locale

1. Copy `content/locales/en/` to `content/locales/{code}/`
2. Translate all files
3. Update your i18n config to include the new locale

### Brand consistency

Always check `brand/voice.md` and `brand/terminology.md` before writing user-facing text.
