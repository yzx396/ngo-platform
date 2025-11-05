# Role-Based Access Control System

This document details the Role-Based Access Control (RBAC) system for the Lead Forward Platform.

## Overview

RBAC provides a two-tier permission model:
- **Admin**: Full administrative access to manage users, content, and platform settings
- **Member**: Regular user with basic access to community features (default role)

This system enables feature-gating and allows administrators to manage permissions without code changes.

## Database Schema

### user_roles table (migration 0007)

```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY to users)
role TEXT (admin|member) -- CHECK constraint ensures valid values
created_at INTEGER (Unix timestamp)
```

**Design Notes:**
- One role per user (UNIQUE constraint on `user_id`)
- Role is required and defaults to 'member'
- Created timestamp for audit trail

**Indexes:**
- `idx_user_roles_user_id`: Fast lookup by user
- `idx_user_roles_role`: Efficient role-based queries

## Type Definitions

Located in `src/types/role.ts`:

```typescript
enum UserRole {
  Admin = 'admin',
  Member = 'member',
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: number;
}

function isAdmin(role: UserRole | undefined): boolean
function getRoleName(role: UserRole): string
function normalizeUserRole(dbRole: unknown): UserRole
```

## API Endpoints

### POST /api/v1/roles (Admin Only)

Assign a role to a user.

**Requires:** Authentication + Admin role

**Request body:**
```typescript
{
  user_id: string;
  role: UserRole;
}
```

**Returns:** Updated `UserRoleRecord`

### GET /api/v1/users/:id/role (Public)

Get user's role by user ID.

**Response:**
```typescript
{
  role: UserRole;
}
```

## Authentication Middleware

Located in `src/worker/auth/middleware.ts`:

```typescript
// Check if user is authenticated
export const requireAuth = (c, next) => { ... }

// Check if user has admin role (requires auth + role verification)
export const requireAdmin = (c, next) => { ... }
```

### Usage in Routes

```typescript
// Admin-only route
app.post("/api/v1/roles", requireAuth, requireAdmin, async (c) => {
  // Admin-only endpoint code
});

// Public route that checks role internally
app.get("/api/v1/users/:id/role", async (c) => {
  // Fetch role from database
});
```

## Frontend Components

### UserRoleBadge

Location: `src/react-app/components/UserRoleBadge.tsx`

Displays role as colored badge with translations.

## Integration with Authentication

Roles are checked via:
1. JWT payload after login (user context)
2. `requireAdmin` middleware on protected routes
3. Conditional UI rendering based on user role

## Bootstrapping First Admin User

When setting up the platform, there's a chicken-and-egg problem: the `POST /api/v1/roles` endpoint requires admin privileges, but there's no admin yet.

**Prerequisites:**
- User account must exist (created via Google OAuth login)
- Know the user's ID from the database

### Steps

1. **Identify your user ID:**
   ```bash
   # Local database
   wrangler d1 execute platform-db-local --local --command "SELECT id, email, name FROM users;"

   # Production database
   wrangler d1 execute platform-db --command "SELECT id, email, name FROM users;"
   ```

2. **Insert admin role** (replace `YOUR_USER_ID_HERE`):
   ```bash
   # Local database
   wrangler d1 execute platform-db-local --local --command "INSERT INTO user_roles (id, user_id, role, created_at) VALUES ('admin-role-1', 'YOUR_USER_ID_HERE', 'admin', strftime('%s', 'now'));"

   # Production database
   wrangler d1 execute platform-db --command "INSERT INTO user_roles (id, user_id, role, created_at) VALUES ('admin-role-1', 'YOUR_USER_ID_HERE', 'admin', strftime('%s', 'now'));"
   ```

3. **Verify role was assigned:**
   ```bash
   # Local
   wrangler d1 execute platform-db-local --local --command "SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID_HERE';"

   # Production
   wrangler d1 execute platform-db --command "SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID_HERE';"
   ```

4. **Refresh authentication** - Log out and log back in so JWT token gets updated with the admin role

After the first admin is created, they can use the `POST /api/v1/roles` API endpoint to promote other users without needing direct database access.

## Testing

Test coverage should include:
- Role assignment and retrieval
- Admin route authorization (blocking non-admins)
- UI rendering based on user role
- Authorization checks on protected endpoints
- Integration with JWT authentication

Run tests with: `npm run test:watch`
