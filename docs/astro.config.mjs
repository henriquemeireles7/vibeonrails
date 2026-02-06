import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import {
  createStarlightConfig,
  link,
  group,
  autogenerate,
} from '@vibeonrails/docs/presets';

// Build Starlight config using @vibeonrails/docs presets
const starlightConfig = createStarlightConfig({
  title: 'VibeonRails',
  description: 'The TypeScript Framework for Vibe Coding',
  social: {
    github: 'https://github.com/vibeonrails/vibeonrails',
  },
  editLinkBaseUrl: 'https://github.com/vibeonrails/vibeonrails/edit/main/docs/',
  customCss: ['./src/styles/custom.css'],
  sidebar: [
    // --- Getting Started ---
    group('Getting Started', [
      link('Introduction', 'getting-started/introduction'),
      link('Installation', 'getting-started/installation'),
      link('Quick Start', 'getting-started/quick-start'),
      link('Project Structure', 'getting-started/project-structure'),
      link('Philosophy', 'getting-started/philosophy'),
    ], { collapsed: false }),

    // --- Tutorials ---
    group('Tutorials', [
      link('Overview', 'tutorials'),
      link('Your First App', 'tutorials/your-first-app'),
      link('Adding Authentication', 'tutorials/authentication'),
      link('Database CRUD', 'tutorials/database-crud'),
      link('API Endpoints', 'tutorials/api-endpoints'),
      link('Frontend Pages', 'tutorials/frontend-pages'),
      link('Writing Tests', 'tutorials/testing'),
      link('Deploying', 'tutorials/deployment'),
      link('Full SaaS App', 'tutorials/full-saas'),
      link('AI Agents', 'tutorials/ai-agents'),
    ], { badge: { text: 'Learn', variant: 'tip' } }),

    // --- Guides ---
    group('Guides', [
      link('Architecture', 'guides/architecture'),
      group('API', [
        link('Overview', 'guides/api'),
        link('Hono Server', 'guides/api/server'),
        link('tRPC Integration', 'guides/api/trpc'),
        link('Procedures', 'guides/api/procedures'),
        link('Request Context', 'guides/api/context'),
        link('Middleware', 'guides/api/middleware'),
        link('Error Handling', 'guides/api/error-handling'),
        link('Rate Limiting', 'guides/api/rate-limiting'),
      ]),
      group('Database', [
        link('Overview', 'guides/database'),
        link('Client & Connections', 'guides/database/client'),
        link('Schema Definitions', 'guides/database/schema'),
        link('Migrations', 'guides/database/migrations'),
        link('Repository Pattern', 'guides/database/repositories'),
        link('Seeds', 'guides/database/seeds'),
        link('Relations', 'guides/database/relations'),
        link('Query Patterns', 'guides/database/queries'),
        link('Transactions', 'guides/database/transactions'),
      ]),
      group('Security', [
        link('Overview', 'guides/security'),
        link('Authentication', 'guides/security/authentication'),
        link('Authorization', 'guides/security/authorization'),
        link('Password Hashing', 'guides/security/passwords'),
        link('JWT Tokens', 'guides/security/jwt'),
        link('Sessions', 'guides/security/sessions'),
        link('OAuth', 'guides/security/oauth'),
        link('CSRF Protection', 'guides/security/csrf'),
        link('Encryption', 'guides/security/crypto'),
        link('Audit Logging', 'guides/security/audit'),
      ]),
      group('Frontend', [
        link('Overview', 'guides/web'),
        link('Components', 'guides/web/components'),
        link('CSS System', 'guides/web/css-system'),
        link('React Hooks', 'guides/web/hooks'),
        link('Routing', 'guides/web/routing'),
        link('tRPC Client', 'guides/web/trpc-client'),
      ]),
      group('Infrastructure', [
        link('Overview', 'guides/infra'),
        link('Health Checks', 'guides/infra/health'),
        link('Logging', 'guides/infra/logging'),
        link('Background Jobs', 'guides/infra/queue'),
        link('Scheduled Tasks', 'guides/infra/cron'),
        link('Email', 'guides/infra/email'),
        link('Caching', 'guides/infra/cache'),
        link('File Storage', 'guides/infra/storage'),
        link('Real-time', 'guides/infra/realtime'),
        link('Monitoring', 'guides/infra/monitoring'),
      ]),
      group('CLI', [
        link('Overview', 'guides/cli'),
        link('Project Scaffolding', 'guides/cli/create-project'),
        link('Code Generators', 'guides/cli/generators'),
        link('Dev Server', 'guides/cli/dev-server'),
        link('Database Commands', 'guides/cli/database-commands'),
        link('Build & Deploy', 'guides/cli/build-deploy'),
      ]),
    ], { collapsed: false, badge: { text: 'Understand', variant: 'note' } }),

    // --- How-To Recipes ---
    group('How-To Recipes', [
      link('Overview', 'how-to'),
      autogenerate('API', 'how-to/api'),
      autogenerate('Database', 'how-to/database'),
      autogenerate('Security', 'how-to/security'),
      autogenerate('Frontend', 'how-to/web'),
      autogenerate('Infrastructure', 'how-to/infra'),
      autogenerate('Testing', 'how-to/testing'),
      autogenerate('Deployment', 'how-to/deployment'),
    ], { badge: { text: 'Recipes', variant: 'caution' } }),

    // --- Features ---
    group('Features', [
      autogenerate('Payments (Stripe)', 'features/payments'),
      autogenerate('Admin Panel', 'features/admin'),
      autogenerate('Support', 'features/support'),
      autogenerate('Sales', 'features/sales'),
      autogenerate('Marketing', 'features/marketing'),
    ]),

    // --- Reference ---
    group('Reference', [
      link('Overview', 'reference'),
      autogenerate('API', 'reference/api'),
      autogenerate('Database', 'reference/database'),
      autogenerate('Security', 'reference/security'),
      autogenerate('Frontend', 'reference/web'),
      autogenerate('Infrastructure', 'reference/infra'),
      autogenerate('CLI', 'reference/cli'),
      autogenerate('Features', 'reference/features'),
      link('Error Codes', 'reference/errors'),
      link('Configuration', 'reference/configuration'),
    ], { badge: { text: 'API', variant: 'danger' } }),

    // --- Advanced ---
    autogenerate('Advanced', 'advanced', true),

    // --- Contributing ---
    autogenerate('Contributing', 'contributing', true),

    // --- More ---
    group('More', [
      link('Changelog', 'changelog'),
      link('FAQ', 'faq'),
      link('Troubleshooting', 'troubleshooting'),
      link('Glossary', 'glossary'),
    ]),
  ],
});

export default defineConfig({
  integrations: [starlight(starlightConfig)],
});
