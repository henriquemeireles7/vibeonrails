# @vibeonrails/admin Skill

## Purpose

Auto-generated admin panel for Vibe on Rails. Define your resources and get list, create, edit, and detail views automatically.

## Usage

```typescript
import { defineAdmin, defineResource, generateAdminRoutes } from "@vibeonrails/admin";

const admin = defineAdmin({
  title: "My Admin",
  basePath: "/admin",
  resources: [
    defineResource({
      name: "Users",
      path: "users",
      columns: [
        { key: "name", label: "Name", sortable: true },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
      ],
    }),
  ],
});

const routes = generateAdminRoutes(admin);
```

## Components

- `AdminLayout` — Sidebar + content layout
- `AdminDashboard` — Stats overview
- `ResourceList` — Auto-generated table with search/pagination
- `ResourceForm` — Auto-generated create/edit form
- `ResourceDetail` — Auto-generated detail view
