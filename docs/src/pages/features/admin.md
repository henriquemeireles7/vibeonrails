# Feature: Admin Panel

The admin panel feature provides an auto-generated administrative interface for managing your application's data. Define your resources, and Vibe on Rails generates CRUD views, listing pages, filters, and forms — all with proper authorization.

---

## Overview

The admin module provides:

- **`defineAdmin`** — Configure the admin panel
- **`defineResource`** — Define CRUD resources with custom fields, filters, and actions
- **Auto-generated views** — List, create, edit, and detail views
- **Role-based access** — Admin-only routes by default
- **Search and filtering** — Built-in search, sort, and filter capabilities

---

## Quick Start

### 1. Define Your Admin Configuration

```typescript
// src/modules/admin/admin.config.ts
import { defineAdmin, defineResource } from '@vibeonrails/features/admin';
import { users, posts } from '../../config/schema';

export const admin = defineAdmin({
  basePath: '/admin',
  title: 'My App Admin',
  auth: {
    requiredRole: 'admin',
  },
  resources: [
    usersResource,
    postsResource,
  ],
});
```

### 2. Define Resources

```typescript
const usersResource = defineResource({
  name: 'users',
  table: users,
  label: 'Users',
  labelPlural: 'Users',
  icon: 'users',

  // Which columns to show in the list view
  listFields: ['name', 'email', 'role', 'isActive', 'createdAt'],

  // Which fields are searchable
  searchFields: ['name', 'email'],

  // Which fields appear in create/edit forms
  formFields: ['name', 'email', 'role', 'isActive'],

  // Field configuration
  fields: {
    name: { label: 'Full Name', type: 'text', required: true },
    email: { label: 'Email', type: 'email', required: true },
    role: {
      label: 'Role',
      type: 'select',
      options: [
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Admin' },
        { value: 'moderator', label: 'Moderator' },
      ],
    },
    isActive: { label: 'Active', type: 'boolean' },
    createdAt: { label: 'Joined', type: 'date', readOnly: true },
  },

  // Filters for the list view
  filters: [
    { field: 'role', type: 'select', options: ['user', 'admin', 'moderator'] },
    { field: 'isActive', type: 'boolean', label: 'Active Only' },
  ],
});

const postsResource = defineResource({
  name: 'posts',
  table: posts,
  label: 'Post',
  labelPlural: 'Posts',
  icon: 'file-text',

  listFields: ['title', 'published', 'authorId', 'createdAt'],
  searchFields: ['title', 'content'],
  formFields: ['title', 'content', 'published'],

  fields: {
    title: { label: 'Title', type: 'text', required: true },
    content: { label: 'Content', type: 'textarea', required: true },
    published: { label: 'Published', type: 'boolean' },
    authorId: {
      label: 'Author',
      type: 'relation',
      relation: { resource: 'users', displayField: 'name' },
      readOnly: true,
    },
    createdAt: { label: 'Created', type: 'date', readOnly: true },
  },
});
```

### 3. Register Admin Routes

```typescript
// src/router.ts
import { createAppRouter } from '@vibeonrails/core/api';
import { admin } from './modules/admin/admin.config';

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
  admin: admin.router,  // Auto-generated CRUD routes
});
```

---

## `defineAdmin(config)`

Configures the admin panel at the top level.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | `string` | `'/admin'` | URL prefix for admin routes |
| `title` | `string` | `'Admin'` | Admin panel title |
| `auth.requiredRole` | `string` | `'admin'` | Required role for access |
| `resources` | `Resource[]` | `[]` | Array of resource definitions |
| `dashboard` | `DashboardConfig` | — | Custom dashboard widgets |

---

## `defineResource(config)`

Defines a CRUD resource for the admin panel.

### Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Unique resource identifier (used in URLs) |
| `table` | `DrizzleTable` | Drizzle table schema |
| `label` | `string` | Singular display name |
| `labelPlural` | `string` | Plural display name |
| `icon` | `string` | Icon name for navigation |
| `listFields` | `string[]` | Fields shown in the list view |
| `searchFields` | `string[]` | Fields included in search |
| `formFields` | `string[]` | Fields shown in create/edit forms |
| `fields` | `FieldConfig` | Per-field configuration |
| `filters` | `FilterConfig[]` | List view filters |
| `actions` | `ActionConfig[]` | Custom bulk/row actions |
| `hooks` | `ResourceHooks` | Lifecycle hooks (beforeCreate, afterUpdate, etc.) |
| `permissions` | `PermissionConfig` | Fine-grained permission overrides |

---

## Field Types

| Type | HTML Input | Description |
|------|-----------|-------------|
| `text` | `<input type="text">` | Single-line text |
| `textarea` | `<textarea>` | Multi-line text |
| `email` | `<input type="email">` | Email address |
| `number` | `<input type="number">` | Numeric value |
| `boolean` | `<input type="checkbox">` | True/false toggle |
| `date` | `<input type="date">` | Date picker |
| `datetime` | `<input type="datetime-local">` | Date and time |
| `select` | `<select>` | Dropdown with options |
| `relation` | Custom | Link to another resource |
| `json` | `<textarea>` | JSON editor |
| `image` | File upload | Image with preview |
| `file` | File upload | Generic file upload |

### Field Configuration

```typescript
fields: {
  title: {
    label: 'Title',
    type: 'text',
    required: true,
    placeholder: 'Enter post title',
    helpText: 'Max 200 characters',
    validate: (value: string) => value.length <= 200 || 'Title too long',
  },
  status: {
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' },
    ],
    defaultValue: 'draft',
  },
  avatar: {
    label: 'Avatar',
    type: 'image',
    maxSize: 2 * 1024 * 1024, // 2MB
    accept: ['image/jpeg', 'image/png'],
  },
}
```

---

## Auto-Generated Views

### List View

The list view displays a searchable, sortable, paginated table of records.

Features:
- Column sorting (click headers)
- Full-text search across `searchFields`
- Configurable filters
- Pagination (25 records per page)
- Bulk actions (select multiple rows)
- Row actions (edit, delete)

### Create View

A form with all `formFields`, with validation based on field configuration.

### Edit View

Pre-populated form for updating an existing record.

### Detail View

Read-only view of a single record with all fields.

---

## Custom Actions

Define custom actions for rows or bulk operations.

### Row Actions

```typescript
const usersResource = defineResource({
  // ...
  actions: [
    {
      name: 'impersonate',
      label: 'Impersonate',
      icon: 'user-check',
      handler: async (user) => {
        const token = await signAccessToken({
          sub: user.id,
          email: user.email,
          role: user.role,
        });
        return { redirect: `/?token=${token}` };
      },
      confirm: 'Are you sure you want to impersonate this user?',
    },
    {
      name: 'deactivate',
      label: 'Deactivate',
      icon: 'ban',
      handler: async (user) => {
        await updateUser(user.id, { isActive: false });
        return { message: 'User deactivated' };
      },
      condition: (user) => user.isActive,
    },
  ],
});
```

### Bulk Actions

```typescript
actions: [
  {
    name: 'publish-all',
    label: 'Publish Selected',
    bulk: true,
    handler: async (posts) => {
      await Promise.all(
        posts.map((post) => updatePost(post.id, { published: true })),
      );
      return { message: `${posts.length} posts published` };
    },
  },
],
```

---

## Lifecycle Hooks

Run custom logic before or after CRUD operations.

```typescript
const usersResource = defineResource({
  // ...
  hooks: {
    beforeCreate: async (data) => {
      // Hash password before creating
      if (data.password) {
        data.passwordHash = await hashPassword(data.password);
        delete data.password;
      }
      return data;
    },

    afterCreate: async (user) => {
      // Send welcome email
      await sendEmail({
        to: user.email,
        subject: 'Welcome!',
        body: `Account created by admin.`,
      });

      await audit({
        type: 'user.created_by_admin',
        userId: user.id,
      });
    },

    beforeDelete: async (user) => {
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          throw new ValidationError('Cannot delete the last admin');
        }
      }
    },
  },
});
```

---

## Dashboard Widgets

Customize the admin dashboard with widgets.

```typescript
const admin = defineAdmin({
  // ...
  dashboard: {
    widgets: [
      {
        type: 'stat',
        label: 'Total Users',
        query: async (db) => {
          const [{ count }] = await db.select({ count: count() }).from(users);
          return count;
        },
      },
      {
        type: 'stat',
        label: 'Active Subscriptions',
        query: async (db) => {
          const [{ count }] = await db
            .select({ count: count() })
            .from(billingAccounts)
            .where(ne(billingAccounts.plan, 'free'));
          return count;
        },
      },
      {
        type: 'chart',
        label: 'New Users (Last 30 Days)',
        chartType: 'line',
        query: async (db) => {
          // Return array of { date, value } pairs
          return getNewUsersPerDay(db, 30);
        },
      },
      {
        type: 'table',
        label: 'Recent Sign-ups',
        query: async (db) => {
          return db.query.users.findMany({
            orderBy: desc(users.createdAt),
            limit: 5,
            columns: { name: true, email: true, createdAt: true },
          });
        },
      },
    ],
  },
});
```

---

## Permissions

Override default permissions per resource.

```typescript
const usersResource = defineResource({
  // ...
  permissions: {
    list: ['admin', 'moderator'],
    create: ['admin'],
    edit: ['admin'],
    delete: ['admin'],
    export: ['admin'],
  },
});
```

---

## Accessing Admin Routes

The admin panel generates tRPC routes under the `admin` namespace:

```
admin.users.list     — GET  list users with search/filter/pagination
admin.users.get      — GET  single user by ID
admin.users.create   — POST create a user
admin.users.update   — PUT  update a user
admin.users.delete   — DEL  delete a user
admin.posts.list     — GET  list posts
admin.posts.get      — GET  single post
...
```

All routes require the configured `requiredRole` (default: `admin`).
