# Web Frontend Skill

## Purpose

This directory contains the React frontend for the application, built with @vibeonrails/web.

## Structure

```
src/web/
├── App.tsx               # Main app with routing + providers
├── main.tsx              # React DOM entry point
├── pages/
│   ├── HomePage.tsx      # Public landing page
│   ├── LoginPage.tsx     # Login form
│   ├── RegisterPage.tsx  # Registration form
│   ├── DashboardPage.tsx # Authenticated dashboard
│   ├── PostsPage.tsx     # Posts list
│   └── PostPage.tsx      # Single post view
├── routes/
│   └── index.ts          # Route definitions using defineRoutes()
└── SKILL.md
```

## Patterns

- **Authentication**: Uses `useAuth` from @vibeonrails/web for state, localStorage for token persistence
- **Protected routes**: `ProtectedRoute` component redirects to `/login` if not authenticated
- **API calls**: Direct fetch to tRPC endpoints; upgrade to tRPC React Query for production
- **Components**: Import from `@vibeonrails/web/components` for consistent UI
- **Styling**: Uses CSS classes from `@vibeonrails/web/styles`

## Adding a new page

1. Create `src/web/pages/YourPage.tsx`
2. Add route in `src/web/routes/index.ts`
3. Add `<Route>` in `App.tsx`
