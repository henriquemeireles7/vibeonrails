# Web: Component Library

The `@vibeonrails/web/components` module provides a set of React components for building application UIs. All components are built with TypeScript, use the Vibe on Rails design tokens, and follow accessibility best practices.

---

## Installation

```bash
pnpm add @vibeonrails/web react react-dom
```

```typescript
import {
  // UI Components
  Button, Input, Select, Modal, Toast,

  // Form Components
  FormField,

  // Data Components
  DataTable, Card, List,

  // Layout Components
  PageLayout, Header, Sidebar,
} from '@vibeonrails/web/components';
```

---

## UI Components

### Button

A versatile button component with variants, sizes, and loading state.

```tsx
import { Button } from '@vibeonrails/web/components';

// Variants
<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">More Options</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Saving...</Button>

// Full width
<Button fullWidth>Submit</Button>

// With click handler
<Button variant="primary" onClick={() => handleSave()}>
  Save Changes
</Button>
```

#### `ButtonProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Disables the button |
| `loading` | `boolean` | `false` | Shows loading spinner |
| `fullWidth` | `boolean` | `false` | Stretches to container width |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `() => void` | — | Click handler |
| `children` | `ReactNode` | — | Button content |

---

### Input

A text input with label support, error states, and forwarded refs.

```tsx
import { Input } from '@vibeonrails/web/components';

// Basic
<Input placeholder="Enter your name" />

// With value
<Input value={name} onChange={(e) => setName(e.target.value)} />

// Types
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="Amount" />

// Error state
<Input error="Email is required" />

// Disabled
<Input disabled value="Read-only value" />
```

#### `InputProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `'text'` | HTML input type |
| `placeholder` | `string` | — | Placeholder text |
| `value` | `string` | — | Controlled value |
| `error` | `string` | — | Error message (shows error styling) |
| `disabled` | `boolean` | `false` | Disables the input |
| `onChange` | `ChangeEventHandler` | — | Change handler |

Plus all standard HTML input attributes via `React.InputHTMLAttributes`.

---

### Select

A dropdown select component with options and placeholder support.

```tsx
import { Select } from '@vibeonrails/web/components';

const roles = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
];

<Select
  options={roles}
  value={selectedRole}
  onChange={(value) => setSelectedRole(value)}
  placeholder="Select a role..."
/>
```

#### `SelectProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `SelectOption[]` | *required* | Array of `{ value, label }` |
| `value` | `string` | — | Currently selected value |
| `onChange` | `(value: string) => void` | — | Change handler |
| `placeholder` | `string` | — | Placeholder text |
| `error` | `string` | — | Error message |
| `disabled` | `boolean` | `false` | Disables the select |

---

### Modal

A dialog overlay component with backdrop, close button, and portal rendering.

```tsx
import { Modal } from '@vibeonrails/web/components';

const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Open Modal</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Deletion"
>
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </div>
</Modal>
```

#### `ModalProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | *required* | Controls visibility |
| `onClose` | `() => void` | *required* | Called when modal should close |
| `title` | `string` | — | Modal title |
| `children` | `ReactNode` | — | Modal content |

Features:
- Closes on backdrop click
- Closes on Escape key
- Focus trapping
- Renders via React portal
- Uses `--z-modal` and `--z-modal-backdrop` tokens

---

### Toast

A notification component for success, error, warning, and info messages.

```tsx
import { Toast } from '@vibeonrails/web/components';

<Toast variant="success" message="Changes saved successfully!" />
<Toast variant="error" message="Failed to save. Please try again." />
<Toast variant="warning" message="Your session expires in 5 minutes." />
<Toast variant="info" message="New version available." />

// With dismiss
<Toast
  variant="success"
  message="Saved!"
  onDismiss={() => setShowToast(false)}
/>
```

#### `ToastProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'success' \| 'error' \| 'warning' \| 'info'` | *required* | Toast style |
| `message` | `string` | *required* | Toast message |
| `onDismiss` | `() => void` | — | Dismiss handler |

---

## Form Components

### FormField

A wrapper that combines a label, input, help text, and error message into a cohesive form field.

```tsx
import { FormField, Input, Select } from '@vibeonrails/web/components';

<FormField label="Email" error={errors.email} required>
  <Input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
  />
</FormField>

<FormField label="Role" helpText="Controls access permissions">
  <Select
    options={roleOptions}
    value={role}
    onChange={setRole}
  />
</FormField>
```

#### `FormFieldProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | *required* | Field label |
| `error` | `string` | — | Error message |
| `helpText` | `string` | — | Help text below the input |
| `required` | `boolean` | `false` | Shows required indicator |
| `children` | `ReactNode` | — | The form input element |

---

## Data Components

### Card

A container component for displaying grouped content with optional header and footer.

```tsx
import { Card } from '@vibeonrails/web/components';

<Card
  title="Monthly Revenue"
  subtitle="January 2026"
  footer={<Button variant="ghost">View Details</Button>}
>
  <p className="text-3xl font-bold">$12,450</p>
  <p className="text-secondary">+12% from last month</p>
</Card>
```

#### `CardProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Card title |
| `subtitle` | `string` | — | Card subtitle |
| `footer` | `ReactNode` | — | Footer content |
| `children` | `ReactNode` | — | Card body |

---

### List

A component for rendering ordered or unordered lists of items with optional actions.

```tsx
import { List } from '@vibeonrails/web/components';

const items = [
  { id: '1', label: 'Set up database', description: 'Configure PostgreSQL' },
  { id: '2', label: 'Add authentication', description: 'JWT + sessions' },
  { id: '3', label: 'Deploy to production', description: 'Railway or Fly.io' },
];

<List
  items={items}
  onItemClick={(item) => navigate(`/tasks/${item.id}`)}
  renderAction={(item) => (
    <Button size="sm" variant="ghost" onClick={() => deleteTask(item.id)}>
      Remove
    </Button>
  )}
/>
```

#### `ListProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ListItem[]` | *required* | Array of `{ id, label, description? }` |
| `onItemClick` | `(item: ListItem) => void` | — | Click handler for items |
| `renderAction` | `(item: ListItem) => ReactNode` | — | Render a custom action per item |

---

### DataTable

A feature-rich table component for displaying tabular data with sorting and custom cell rendering.

```tsx
import { DataTable } from '@vibeonrails/web/components';

const columns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role',
    render: (value: string) => <span className="vr-badge">{value}</span>
  },
  { key: 'createdAt', header: 'Joined',
    render: (value: string) => new Date(value).toLocaleDateString()
  },
];

const users = [
  { name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: '2026-01-15' },
  { name: 'Bob', email: 'bob@example.com', role: 'user', createdAt: '2026-01-20' },
];

<DataTable
  columns={columns}
  data={users}
  onSort={(key, direction) => handleSort(key, direction)}
/>
```

#### `DataTableProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `Column[]` | *required* | Column definitions |
| `data` | `Record<string, unknown>[]` | *required* | Row data |
| `onSort` | `(key: string, dir: 'asc' \| 'desc') => void` | — | Sort handler |

#### `Column`

| Prop | Type | Description |
|------|------|-------------|
| `key` | `string` | Data field key |
| `header` | `string` | Column header text |
| `sortable` | `boolean` | Enable sorting |
| `render` | `(value: unknown, row: Record) => ReactNode` | Custom cell renderer |

---

## Layout Components

### Header

The application header with logo, navigation, and user menu areas.

```tsx
import { Header } from '@vibeonrails/web/components';

<Header
  logo={<img src="/logo.svg" alt="My App" height={32} />}
  nav={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
  ]}
  actions={
    <Button variant="ghost" onClick={handleLogout}>
      Log Out
    </Button>
  }
/>
```

#### `HeaderProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logo` | `ReactNode` | — | Logo element |
| `nav` | `{ label: string; href: string }[]` | — | Navigation links |
| `actions` | `ReactNode` | — | Right-side actions (buttons, avatar, etc.) |

---

### Sidebar

A vertical navigation sidebar with sections and items.

```tsx
import { Sidebar } from '@vibeonrails/web/components';

const items = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'home' },
  { id: 'users', label: 'Users', href: '/users', icon: 'users' },
  { id: 'posts', label: 'Posts', href: '/posts', icon: 'file-text' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'cog' },
];

<Sidebar
  items={items}
  activeId="dashboard"
  onItemClick={(item) => navigate(item.href)}
/>
```

#### `SidebarProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `SidebarItem[]` | *required* | Navigation items |
| `activeId` | `string` | — | Currently active item ID |
| `onItemClick` | `(item: SidebarItem) => void` | — | Click handler |

#### `SidebarItem`

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier |
| `label` | `string` | Display label |
| `href` | `string` | Navigation URL |
| `icon` | `string` | Icon name (optional) |

---

### PageLayout

A full-page layout component that combines Header, Sidebar, and a main content area.

```tsx
import { PageLayout, Header, Sidebar } from '@vibeonrails/web/components';

<PageLayout
  header={<Header logo={<Logo />} nav={navItems} />}
  sidebar={<Sidebar items={sidebarItems} activeId={currentPage} />}
>
  <h1>Dashboard</h1>
  <p>Your main content goes here.</p>
</PageLayout>
```

#### `PageLayoutProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `header` | `ReactNode` | — | Header component |
| `sidebar` | `ReactNode` | — | Sidebar component |
| `children` | `ReactNode` | — | Main content area |

---

## Composing a Full Page

Here's a complete example of a dashboard page using all layout and data components together:

```tsx
import {
  PageLayout, Header, Sidebar,
  Card, DataTable, Button, Toast,
} from '@vibeonrails/web/components';

export function DashboardPage() {
  return (
    <PageLayout
      header={
        <Header
          logo={<span style={{ fontWeight: 700 }}>My App</span>}
          nav={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Users', href: '/users' },
          ]}
          actions={<Button variant="ghost">Log Out</Button>}
        />
      }
      sidebar={
        <Sidebar
          items={[
            { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
            { id: 'users', label: 'Users', href: '/users' },
            { id: 'posts', label: 'Posts', href: '/posts' },
          ]}
          activeId="dashboard"
        />
      }
    >
      <h1>Dashboard</h1>

      <div className="vr-grid vr-grid-cols-3 vr-gap-4">
        <Card title="Total Users">
          <p className="vr-text-3xl vr-font-bold">1,234</p>
        </Card>
        <Card title="Active Posts">
          <p className="vr-text-3xl vr-font-bold">567</p>
        </Card>
        <Card title="Revenue">
          <p className="vr-text-3xl vr-font-bold">$8,901</p>
        </Card>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role' },
        ]}
        data={users}
      />
    </PageLayout>
  );
}
```
