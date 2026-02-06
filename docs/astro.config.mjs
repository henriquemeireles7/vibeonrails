import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'VibeonRails',
      description: 'The TypeScript Framework for Vibe Coding',
      social: {
        github: 'https://github.com/vibeonrails/vibeonrails',
      },
      editLink: {
        baseUrl: 'https://github.com/vibeonrails/vibeonrails/edit/main/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Project Structure', slug: 'getting-started/project-structure' },
            { label: 'Philosophy', slug: 'getting-started/philosophy' },
          ],
        },
        {
          label: 'Tutorials',
          badge: { text: 'Learn', variant: 'tip' },
          items: [
            { label: 'Overview', slug: 'tutorials' },
            { label: 'Your First App', slug: 'tutorials/your-first-app' },
            { label: 'Adding Authentication', slug: 'tutorials/authentication' },
            { label: 'Database CRUD', slug: 'tutorials/database-crud' },
            { label: 'API Endpoints', slug: 'tutorials/api-endpoints' },
            { label: 'Frontend Pages', slug: 'tutorials/frontend-pages' },
            { label: 'Writing Tests', slug: 'tutorials/testing' },
            { label: 'Deploying', slug: 'tutorials/deployment' },
            { label: 'Full SaaS App', slug: 'tutorials/full-saas' },
            { label: 'AI Agents', slug: 'tutorials/ai-agents' },
          ],
        },
        {
          label: 'Guides',
          badge: { text: 'Understand', variant: 'note' },
          items: [
            { label: 'Architecture', slug: 'guides/architecture' },
            {
              label: 'API',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/api' },
                { label: 'Hono Server', slug: 'guides/api/server' },
                { label: 'tRPC Integration', slug: 'guides/api/trpc' },
                { label: 'Procedures', slug: 'guides/api/procedures' },
                { label: 'Request Context', slug: 'guides/api/context' },
                { label: 'Middleware', slug: 'guides/api/middleware' },
                { label: 'Error Handling', slug: 'guides/api/error-handling' },
                { label: 'Rate Limiting', slug: 'guides/api/rate-limiting' },
              ],
            },
            {
              label: 'Database',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/database' },
                { label: 'Client & Connections', slug: 'guides/database/client' },
                { label: 'Schema Definitions', slug: 'guides/database/schema' },
                { label: 'Migrations', slug: 'guides/database/migrations' },
                { label: 'Repository Pattern', slug: 'guides/database/repositories' },
                { label: 'Seeds', slug: 'guides/database/seeds' },
                { label: 'Relations', slug: 'guides/database/relations' },
                { label: 'Query Patterns', slug: 'guides/database/queries' },
                { label: 'Transactions', slug: 'guides/database/transactions' },
              ],
            },
            {
              label: 'Security',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/security' },
                { label: 'Authentication', slug: 'guides/security/authentication' },
                { label: 'Authorization', slug: 'guides/security/authorization' },
                { label: 'Password Hashing', slug: 'guides/security/passwords' },
                { label: 'JWT Tokens', slug: 'guides/security/jwt' },
                { label: 'Sessions', slug: 'guides/security/sessions' },
                { label: 'OAuth', slug: 'guides/security/oauth' },
                { label: 'CSRF Protection', slug: 'guides/security/csrf' },
                { label: 'Encryption', slug: 'guides/security/crypto' },
                { label: 'Audit Logging', slug: 'guides/security/audit' },
              ],
            },
            {
              label: 'Frontend',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/web' },
                { label: 'Components', slug: 'guides/web/components' },
                { label: 'CSS System', slug: 'guides/web/css-system' },
                { label: 'React Hooks', slug: 'guides/web/hooks' },
                { label: 'Routing', slug: 'guides/web/routing' },
                { label: 'tRPC Client', slug: 'guides/web/trpc-client' },
              ],
            },
            {
              label: 'Infrastructure',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/infra' },
                { label: 'Health Checks', slug: 'guides/infra/health' },
                { label: 'Logging', slug: 'guides/infra/logging' },
                { label: 'Background Jobs', slug: 'guides/infra/queue' },
                { label: 'Scheduled Tasks', slug: 'guides/infra/cron' },
                { label: 'Email', slug: 'guides/infra/email' },
                { label: 'Caching', slug: 'guides/infra/cache' },
                { label: 'File Storage', slug: 'guides/infra/storage' },
                { label: 'Real-time', slug: 'guides/infra/realtime' },
                { label: 'Monitoring', slug: 'guides/infra/monitoring' },
              ],
            },
            {
              label: 'CLI',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'guides/cli' },
                { label: 'Project Scaffolding', slug: 'guides/cli/create-project' },
                { label: 'Code Generators', slug: 'guides/cli/generators' },
                { label: 'Dev Server', slug: 'guides/cli/dev-server' },
                { label: 'Database Commands', slug: 'guides/cli/database-commands' },
                { label: 'Build & Deploy', slug: 'guides/cli/build-deploy' },
              ],
            },
          ],
        },
        {
          label: 'How-To Recipes',
          badge: { text: 'Recipes', variant: 'caution' },
          items: [
            { label: 'Overview', slug: 'how-to' },
            {
              label: 'API',
              collapsed: true,
              autogenerate: { directory: 'how-to/api' },
            },
            {
              label: 'Database',
              collapsed: true,
              autogenerate: { directory: 'how-to/database' },
            },
            {
              label: 'Security',
              collapsed: true,
              autogenerate: { directory: 'how-to/security' },
            },
            {
              label: 'Frontend',
              collapsed: true,
              autogenerate: { directory: 'how-to/web' },
            },
            {
              label: 'Infrastructure',
              collapsed: true,
              autogenerate: { directory: 'how-to/infra' },
            },
            {
              label: 'Testing',
              collapsed: true,
              autogenerate: { directory: 'how-to/testing' },
            },
            {
              label: 'Deployment',
              collapsed: true,
              autogenerate: { directory: 'how-to/deployment' },
            },
          ],
        },
        {
          label: 'Features',
          items: [
            {
              label: 'Payments (Stripe)',
              collapsed: true,
              autogenerate: { directory: 'features/payments' },
            },
            {
              label: 'Admin Panel',
              collapsed: true,
              autogenerate: { directory: 'features/admin' },
            },
            {
              label: 'Support',
              collapsed: true,
              autogenerate: { directory: 'features/support' },
            },
            {
              label: 'Sales',
              collapsed: true,
              autogenerate: { directory: 'features/sales' },
            },
            {
              label: 'Marketing',
              collapsed: true,
              autogenerate: { directory: 'features/marketing' },
            },
          ],
        },
        {
          label: 'Reference',
          badge: { text: 'API', variant: 'danger' },
          items: [
            { label: 'Overview', slug: 'reference' },
            {
              label: 'API',
              collapsed: true,
              autogenerate: { directory: 'reference/api' },
            },
            {
              label: 'Database',
              collapsed: true,
              autogenerate: { directory: 'reference/database' },
            },
            {
              label: 'Security',
              collapsed: true,
              autogenerate: { directory: 'reference/security' },
            },
            {
              label: 'Frontend',
              collapsed: true,
              autogenerate: { directory: 'reference/web' },
            },
            {
              label: 'Infrastructure',
              collapsed: true,
              autogenerate: { directory: 'reference/infra' },
            },
            {
              label: 'CLI',
              collapsed: true,
              autogenerate: { directory: 'reference/cli' },
            },
            {
              label: 'Features',
              collapsed: true,
              autogenerate: { directory: 'reference/features' },
            },
            { label: 'Error Codes', slug: 'reference/errors' },
            { label: 'Configuration', slug: 'reference/configuration' },
          ],
        },
        {
          label: 'Advanced',
          collapsed: true,
          autogenerate: { directory: 'advanced' },
        },
        {
          label: 'Contributing',
          collapsed: true,
          autogenerate: { directory: 'contributing' },
        },
        {
          label: 'More',
          items: [
            { label: 'Changelog', slug: 'changelog' },
            { label: 'FAQ', slug: 'faq' },
            { label: 'Troubleshooting', slug: 'troubleshooting' },
            { label: 'Glossary', slug: 'glossary' },
          ],
        },
      ],
    }),
  ],
});
