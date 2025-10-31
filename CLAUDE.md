# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Lead Forward Platform** - an NGO community website built as a full-stack application using React + Vite + Hono + Cloudflare Workers. The project uses a hybrid architecture where the React frontend and Hono backend are deployed together to Cloudflare's edge network.

The platform is designed to support mentor-mentee matching and other community features for NGO members.

## Development Commands

```bash
# Install dependencies
npm install

# Start local development server (includes both frontend and worker)
npm run dev

# Run linter
npm run lint

# Build for production (TypeScript compilation + Vite build)
npm run build

# Preview production build locally
npm run preview

# Type-check and build verification (includes dry-run deploy)
npm run check

# Deploy to Cloudflare Workers
npm run deploy

# Generate Cloudflare types from wrangler.json
npm run cf-typegen

# Monitor deployed worker logs
npx wrangler tail

# Run tests
npm run test              # Run all tests once
npm run test:watch        # Run tests in watch mode (auto-rerun on changes)
npm run test:coverage     # Run tests with coverage report
npm run test:ui           # Run tests with interactive UI

# Run specific tests (for faster iteration)
npm run test:watch -- src/react-app/__tests__/App.test.tsx    # Run single test file
npm run test:watch -- --project=react                         # Run only React tests
npm run test:watch -- --project=worker                        # Run only Worker tests
npm run test -- --run src/worker/__tests__/index.test.ts      # Run single test once

# Database migrations (local)
npm run db:migrate        # Run all pending migrations on local D1 database
npm run db:schema         # Display the current database schema

# Database migrations (production)
npm run db:migrate:prod   # Run all pending migrations on production Cloudflare D1
npm run db:schema:prod    # Display the production database schema
```

## Test-Driven Development Workflow

This project follows a Test-Driven Development (TDD) approach. **Always write tests before implementing features or fixing bugs.**

### TDD Cycle: Red-Green-Refactor

1. **Red**: Write a failing test first
   - Create a test that describes the desired behavior
   - Run the test to confirm it fails (this validates the test works)

2. **Green**: Write minimal code to make the test pass
   - Implement just enough code to satisfy the test
   - Don't worry about perfect code yet

3. **Refactor**: Improve the code while keeping tests green
   - Clean up implementation
   - Remove duplication
   - Improve readability
   - Ensure all tests still pass

### When to Write Tests

**ALWAYS write tests when:**
- Adding a new feature (write test first, then implement)
- Fixing a bug (write test that reproduces bug, then fix)
- Refactoring existing code (ensure tests exist and pass before/after)
- Modifying API endpoints or business logic
- Creating new React components

**Tests are NOT optional** - they are part of the definition of "done" for any task.

### Test Organization

Tests are colocated with source files in `__tests__` directories:

```
src/
├── react-app/
│   ├── __tests__/
│   │   ├── App.test.tsx        # React component tests
│   │   └── utils.test.ts       # Utility function tests
│   ├── App.tsx
│   └── main.tsx
└── worker/
    ├── __tests__/
    │   ├── index.test.ts       # Hono API route tests
    │   └── handlers.test.ts    # Request handler tests
    └── index.ts
```

**Test Environments:**

The project uses Vitest with two separate test environments configured in `vitest.config.ts`:

1. **React tests** (`--project=react`)
   - Environment: `jsdom` (simulates browser DOM)
   - Pattern: `src/react-app/**/*.test.{ts,tsx}`
   - Use for: Component tests, browser API tests

2. **Worker tests** (`--project=worker`)
   - Environment: `node` (Node.js with Web APIs)
   - Pattern: `src/worker/**/*.test.ts`
   - Use for: API route tests, server-side logic

This separation ensures tests run in the correct environment (DOM for React, Node for Workers).

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: Use `describe()` to group related tests
- Test cases: Use `it()` or `test()` with clear, descriptive names
- Example: `it('should return 404 when resource not found')`

### Testing Frontend (React Components)

Use React Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render greeting message', () => {
    render(<MyComponent name="World" />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });
});
```

**Best practices:**
- Test user-facing behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText, getByText)
- Avoid testing internal state
- Test accessibility (proper ARIA labels, keyboard navigation)

### Testing Backend (Hono API Routes)

Use Cloudflare Workers testing utilities:

```typescript
import { describe, it, expect } from 'vitest';
import app from './index';

describe('API Routes', () => {
  it('GET /api/health should return 200', async () => {
    const req = new Request('http://localhost/api/health');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: 'ok' });
  });
});
```

**Best practices:**
- Test all HTTP methods (GET, POST, PUT, DELETE)
- Test error cases (400, 404, 500 responses)
- Test request validation
- Test authentication/authorization flows
- Mock external dependencies (databases, APIs)

### Running Tests During Development

1. **Start test watcher**: `npm run test:watch`
   - Automatically reruns tests when files change
   - Provides instant feedback during development

2. **Write test first** (following TDD)
   - Test will fail initially (Red)

3. **Implement feature**
   - Watch tests turn green as you code

4. **Refactor if needed**
   - Tests ensure you don't break functionality

### Before Committing

Always run the full test suite before committing:

```bash
npm run test              # Ensure all tests pass
npm run lint              # Fix any linting issues
npm run build             # Verify build succeeds
```

### Coverage Goals

- Aim for **>80% code coverage** for critical paths
- **100% coverage** for business logic and API handlers
- View coverage report: `npm run test:coverage`

### Continuous Integration

Tests run automatically on:
- Pre-commit (via git hooks, if configured)
- Pull requests
- Before deployment

**Never deploy code without passing tests.**

## Architecture

### Project Structure

The codebase is split into three distinct TypeScript projects using TypeScript project references:

1. **React App** (`src/react-app/`)
   - Entry point: `src/react-app/main.tsx`
   - Main component: `src/react-app/App.tsx`
   - Config: `tsconfig.app.json`
   - Target: ES2020 with DOM libraries
   - Uses React 19 with StrictMode

2. **Cloudflare Worker** (`src/worker/`)
   - Entry point: `src/worker/index.ts`
   - Config: `tsconfig.worker.json` (extends `tsconfig.node.json`)
   - Uses Hono framework for routing
   - Main file specified in `wrangler.json`

3. **Build Config** (`vite.config.ts`)
   - Config: `tsconfig.node.json`
   - Target: ES2022

4. **Shared Types** (`src/types/`)
   - Contains type definitions shared between React and Worker
   - Files: `user.ts`, `mentor.ts`, `match.ts`, `api.ts`
   - These types are imported in both frontend and backend code
   - Example: `MentoringLevel` enum and `MentorProfile` interface used across the codebase

### Build and Deployment Flow

1. **Development**: `npm run dev` starts Vite dev server with Cloudflare plugin, providing HMR for both frontend and worker
2. **Build**: `tsc -b && vite build` compiles all TypeScript projects and bundles the app
3. **Deploy**: Wrangler deploys the worker to Cloudflare's edge network
   - Worker code: `src/worker/index.ts`
   - Static assets: `dist/client/` (built React app)
   - Configuration: `wrangler.json` defines worker name, compatibility date, and asset handling

### Frontend-Backend Communication

- Frontend makes API calls to `/api/*` routes
- Backend (Hono) handles these routes in `src/worker/index.ts`
- Both are served from the same Cloudflare Worker
- Static assets configured with SPA fallback (`not_found_handling: "single-page-application"`)

**API Versioning Convention:**

All API endpoints MUST be versioned using `/api/v1/` prefix:
- ✅ Good: `/api/v1/users`, `/api/v1/mentors/profiles`, `/api/v1/matches`
- ❌ Bad: `/api/users`, `/api/mentors`

This allows future API changes without breaking existing clients. When making breaking changes, create `/api/v2/` routes.

**API Client Pattern:**

The project uses a centralized, type-safe API client pattern:
- `src/react-app/services/apiClient.ts`: Base API client with request/response handling
- Service layer: `mentorService.ts`, `matchService.ts`, etc. wrap API calls with business logic
- Benefits:
  - Centralized error handling and request interceptors
  - Type safety through shared types from `src/types/`
  - Easy to mock in tests
  - Single source of truth for API endpoints

Example service structure:
```typescript
// Service wraps API calls with type-safe methods
import { apiClient } from './apiClient';
import { MentorProfile } from '../types/mentor';

export const mentorService = {
  async getProfile(userId: string): Promise<MentorProfile> {
    return apiClient.get(`/api/v1/mentors/profiles/${userId}`);
  },
  // ... more methods
};

// Component uses the service
const profile = await mentorService.getProfile(userId);
```

### TypeScript Configuration

The root `tsconfig.json` uses project references to coordinate three separate compilation contexts:
- `tsconfig.app.json`: React app with DOM types and JSX
- `tsconfig.worker.json`: Worker code with Cloudflare runtime types
- `tsconfig.node.json`: Build tools and Vite config

All projects use strict mode with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled.

## Key Dependencies

- **Hono**: Web framework for the Cloudflare Worker backend
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **@cloudflare/vite-plugin**: Integrates Cloudflare Workers with Vite
- **Wrangler**: Cloudflare's CLI for Workers deployment

## Cloudflare Configuration

The `wrangler.json` file contains:
- Worker name and main entry point
- Compatibility date and flags (nodejs_compat enabled)
- Observability enabled
- Source map uploads enabled
- Static assets directory and SPA routing configuration

To modify worker bindings (KV, D1, R2, etc.), add them to `wrangler.json` and regenerate types with `npm run cf-typegen`.

## Database (Cloudflare D1)

### Configuration

When adding database functionality:

1. **Add D1 binding** to `wrangler.json`:
   ```json
   {
     "d1_databases": [
       {
         "binding": "platform_db",
         "database_name": "platform-db",
         "database_id": "your-database-id"
       }
     ]
   }
   ```

2. **Local Development**: The `wrangler.json` includes an `env.local` configuration that uses a local D1 database stored in `.wrangler/state/d1/`. This is automatically used when running `npm run dev`.

3. **Regenerate types**: `npm run cf-typegen` to update `worker-configuration.d.ts` after modifying bindings

### Creating and Running Migrations

This project uses **Cloudflare D1's native migration system** which automatically tracks applied migrations in a `d1_migrations` table. This prevents accidental re-runs of the same migration.

**Migration Files:**
- Located in `migrations/` directory
- Name format: `0001_description.sql`, `0002_description.sql`, etc.
- Example: `migrations/0001_create_users_table.sql`
- All migrations are written in SQLite syntax with idempotent DDL (`IF NOT EXISTS`, `IF NOT EXISTS INDEX`, etc.)

**Creating New Migrations:**

Create a new migration file manually:
```bash
# Create migration file: migrations/0006_your_change.sql
# Follow the existing naming convention and include descriptive comments
```

Or use Wrangler to create and apply:
```bash
wrangler d1 migrations create platform-db "your change description"
# Edit the generated file in migrations/ directory
npm run db:migrate
```

**Local Development:**

Apply all pending migrations to local D1:
```bash
npm run db:migrate
```

List which migrations have been applied locally:
```bash
npm run db:list
```

View local database schema:
```bash
npm run db:schema
```

**Production:**

Apply all pending migrations to production Cloudflare D1:
```bash
npm run db:migrate:prod
```

List which migrations have been applied in production:
```bash
npm run db:list:prod
```

View production database schema:
```bash
npm run db:schema:prod
```

**How It Works:**

1. D1 creates a `d1_migrations` table in your database
2. Each applied migration's name is recorded in this table
3. The `wrangler d1 migrations apply` command only runs migrations that aren't in the table
4. This ensures migrations are idempotent at the workflow level (never re-run the same migration)

**Migration Best Practices:**

- ✅ **DO**: Create new migrations for each schema change (never edit existing ones)
- ✅ **DO**: Write idempotent SQL using `IF NOT EXISTS`, `IF NOT EXISTS INDEX`
- ✅ **DO**: Test migrations locally with `npm run db:migrate` before production
- ✅ **DO**: Use descriptive filenames and include comments explaining the change
- ❌ **DON'T**: Edit or delete existing migration files after they've been applied
- ❌ **DON'T**: Re-run `npm run db:migrate` expecting it to fail gracefully (D1 tracking prevents re-runs)

**Resetting Local Database (Development Only):**

If you need to start fresh locally:
```bash
# Delete local D1 database (be careful!)
rm -rf .wrangler/state/d1/

# Re-run all migrations
npm run db:migrate
```

⚠️ **Important**: Always test migrations locally first before running against production. Production migrations should be done carefully as they may impact live users. Never delete or modify migrations that have been applied to production.

### Using Database in Worker Code

```typescript
app.get('/api/v1/users', async (c) => {
  const db = c.env.platform_db;
  const result = await db.prepare('SELECT * FROM users').all();
  return c.json(result.results);
});
```

### Testing with Database Mocks

Mock the D1 database in tests:
```typescript
const mockDb = {
  prepare: vi.fn(() => ({
    all: vi.fn(() => ({ results: [] }))
  }))
};

// Pass to test context
const c = { env: { platform_db: mockDb } };
```

**Important:**
- D1 uses SQLite syntax. Refer to [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/) for query syntax and limitations.
- The binding name is `platform_db` (specified in `wrangler.json`), not `DB`.

## Project-Specific Patterns

### Bit Flags for Database Efficiency

The mentor-mentee matching feature uses **bit flags** for storing multiple selections (mentoring levels, payment types) as integers:

```typescript
// Instead of storing arrays: ["entry", "senior"]
// Store as integer: 3 (binary: 0011, which is 1 + 2)

enum MentoringLevel {
  Entry = 1,       // 2^0
  Senior = 2,      // 2^1
  Staff = 4,       // 2^2
  Management = 8   // 2^3
}

// Check if has level: (levels & MentoringLevel.Senior) !== 0
// Add level: levels | MentoringLevel.Staff
// Remove level: levels & ~MentoringLevel.Entry
```

**Benefits:**
- Faster database queries (integer bitwise operations vs JSON parsing)
- Efficient indexing in SQLite
- Smaller storage footprint

**Implementation:** See `src/types/mentor.ts` for helper functions (`hasLevel`, `addLevel`, `getLevelNames`, etc.)

### User-Driven Matching

The platform uses a **mentee-initiated** matching system (not algorithm-based):
- Mentees browse and search mentor profiles
- Mentees send match requests (creates `pending` status)
- Mentors accept or reject requests
- Match progresses: `pending` → `accepted` → `active` → `completed`

This keeps the UX simple and gives users full control over matching.

## Authentication System

### Overview

The platform uses **Google OAuth 2.0** for user authentication with **JWT tokens** for session management. This approach is stateless and works well with Cloudflare's edge computing model.

**Key Features:**
- Single sign-on via Google OAuth 2.0
- Stateless JWT-based authentication
- No passwords stored in database
- Automatic user account creation on first login
- Email linking for returning users

### Setup Guide

See `GOOGLE_OAUTH_SETUP.md` for detailed step-by-step instructions to:
1. Create a Google Cloud Console project
2. Set up OAuth credentials
3. Configure redirect URIs for local and production environments
4. Add environment variables to your development setup

### Architecture

**Backend (Cloudflare Worker):**
- `src/worker/auth/jwt.ts` - JWT token creation and verification using `jose`
- `src/worker/auth/middleware.ts` - Authentication middleware that extracts and validates JWT from Authorization header
- `src/worker/auth/google.ts` - Google OAuth flow (login URL generation, code exchange, user profile fetch)
- Routes:
  - `GET /api/v1/auth/google/login` - Returns Google OAuth login URL
  - `GET /api/v1/auth/google/callback` - Handles OAuth callback, exchanges code for token
  - `GET /api/v1/auth/me` - Returns current authenticated user
  - `POST /api/v1/auth/logout` - Logout endpoint (frontend clears token)

**Frontend (React):**
- `src/react-app/context/AuthContext.tsx` - Auth state management and hooks (`useAuth()`)
- `src/react-app/pages/LoginPage.tsx` - Login page with "Sign in with Google" button
- `src/react-app/pages/OAuthCallbackPage.tsx` - Handles OAuth redirect and token exchange
- `src/react-app/components/ProtectedRoute.tsx` - Route wrapper that requires authentication
- `src/react-app/services/apiClient.ts` - Automatically attaches JWT token to all API requests

**Database:**
- Users table includes `google_id` column (stores Google's user ID)
- Enables account linking if user signs up with same email
- See `migrations/0002_add_google_oauth.sql`

### JWT Token Format

Tokens include the following claims:
```typescript
{
  userId: string;      // User ID from database
  email: string;       // User email
  name: string;        // User display name
  iat: number;         // Issued at (Unix timestamp)
  exp: number;         // Expires at (Unix timestamp, default 7 days)
}
```

Token is stored in browser localStorage and automatically sent with all API requests in the `Authorization: Bearer <token>` header.

### Protected Routes

**Public Routes (no authentication required):**
- `GET /api/v1/mentors/search` - Search mentors
- `GET /api/v1/mentors/profiles/:id` - Get mentor profile by ID
- Frontend route `/mentors/browse` - Browse and search mentors

**Protected Routes (authentication required):**
- `POST /api/v1/mentors/profiles` - Create mentor profile
- `PUT /api/v1/mentors/profiles/:id` - Update mentor profile
- `DELETE /api/v1/mentors/profiles/:id` - Delete mentor profile
- `GET /api/v1/matches` - List user's matches
- `POST /api/v1/matches` - Create match request
- `POST /api/v1/matches/:id/respond` - Respond to match request
- `PATCH /api/v1/matches/:id/complete` - Mark match as completed
- `DELETE /api/v1/matches/:id` - Delete match
- Frontend route `/mentor/profile/setup` - Create mentor profile
- Frontend route `/matches` - View matches

Frontend enforces protection with `ProtectedRoute` wrapper component that redirects unauthenticated users to `/login`.

### Environment Variables

**Local Development** (in `wrangler.json` env.local):
```json
"vars": {
  "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret",
  "JWT_SECRET": "dev-secret-key"
}
```

**Production** (set via `wrangler secret put`):
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

### User Flow

1. **Login**
   - User clicks "Sign In with Google" on `/login`
   - Frontend calls `GET /api/v1/auth/google/login` to get OAuth URL
   - User redirected to Google's consent screen
   - Google redirects back to `/auth/google/callback?code=...`

2. **Token Exchange**
   - Frontend calls `GET /api/v1/auth/google/callback` with authorization code
   - Backend exchanges code for access token with Google
   - Backend fetches user profile from Google
   - Backend creates or links user account (by google_id or email)
   - Backend generates JWT token and returns to frontend

3. **Session Management**
   - Frontend stores JWT in localStorage
   - Frontend sends token with all subsequent API requests
   - Backend validates token with `authMiddleware`
   - If token invalid or expired, user gets 401 response
   - Frontend redirects to login

4. **Logout**
   - User clicks "Sign Out" button
   - Frontend clears JWT from localStorage
   - Frontend redirects to `/login`
   - No server-side session to invalidate (stateless JWT)

### Security Considerations

**Strengths:**
- No passwords stored
- OAuth credentials never exposed to frontend
- JWT tokens are short-lived (7 days default)
- Stateless design scales with edge computing
- Email linking prevents duplicate accounts

**Recommendations:**
- Use HTTPS in production (enforced by Cloudflare)
- Set strong JWT_SECRET (use `wrangler secret put`)
- Rotate JWT_SECRET periodically for production deployments
- Monitor login attempts for suspicious patterns
- Consider rate limiting on `/api/v1/auth/*` endpoints
- Add email verification for security-sensitive operations

### Testing

**Backend Auth Tests** (`src/worker/__tests__/auth.test.ts`):
- JWT token creation and verification
- OAuth code exchange
- User auto-creation from Google profile
- Protected route authorization checks
- Token expiration handling

**Frontend Auth Tests** (`src/react-app/__tests__/auth.test.tsx`):
- AuthContext state management
- Login flow and token storage
- Protected route redirects
- API client JWT attachment
- Logout functionality

Run tests: `npm run test:watch -- --project=worker` or `npm run test:watch -- --project=react`

### Bootstrapping First Admin User

When setting up the platform, there's a chicken-and-egg problem: the `POST /api/v1/roles` endpoint requires admin privileges to assign roles, but there's no admin yet. Use direct SQL commands to create the first admin.

**Prerequisites:**
- User account must exist (created via Google OAuth login)
- Know the user's ID from the database

**Steps:**

1. **Identify your user ID**:
   ```bash
   # Local database
   wrangler d1 execute platform-db-local --local --command "SELECT id, email, name FROM users;"

   # Production database
   wrangler d1 execute platform-db --command "SELECT id, email, name FROM users;"
   ```

2. **Insert admin role** into `user_roles` table (replace `YOUR_USER_ID_HERE`):
   ```bash
   # Local database
   wrangler d1 execute platform-db-local --local --command "INSERT INTO user_roles (id, user_id, role, created_at) VALUES ('admin-role-1', 'YOUR_USER_ID_HERE', 'admin', strftime('%s', 'now'));"

   # Production database
   wrangler d1 execute platform-db --command "INSERT INTO user_roles (id, user_id, role, created_at) VALUES ('admin-role-1', 'YOUR_USER_ID_HERE', 'admin', strftime('%s', 'now'));"
   ```

3. **Verify the role was assigned**:
   ```bash
   # Local
   wrangler d1 execute platform-db-local --local --command "SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID_HERE';"

   # Production
   wrangler d1 execute platform-db --command "SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID_HERE';"
   ```

4. **Refresh authentication** - Log out and log back in so the JWT token gets updated with the admin role

After the first admin is created, they can use the `POST /api/v1/roles` API endpoint to promote other users without needing direct database access.

## Internationalization (i18n)

The platform supports multiple languages with **Simplified Chinese (zh-CN) as the default** and **English as fallback**. The implementation uses `react-i18next` for flexible, type-safe translations.

### How It Works

- **Framework**: `i18next` with `react-i18next` hooks
- **Language detection**: Browser language preference, localStorage, HTML lang attribute (in order)
- **Default language**: Simplified Chinese (zh-CN)
- **Fallback language**: English (en)
- **Translation files**: JSON files in `src/react-app/i18n/locales/`

### File Structure

```
src/react-app/i18n/
├── index.ts                              # i18n configuration and initialization
├── locales/
│   ├── zh-CN/
│   │   └── translation.json             # Simplified Chinese translations
│   └── en/
│       └── translation.json             # English translations
```

### Using Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('home.subtitle')}</p>
      {/* With interpolation */}
      <p>{t('common.signedInAs', { name: user.name })}</p>
    </div>
  );
}
```

### Translation Key Organization

Translations are organized by feature in the JSON namespace:

- **common**: Generic UI elements (buttons, labels, navigation)
- **home**: Home page content and features
- **auth**: Authentication-related strings (login, OAuth)
- **mentor**: Mentor profile and browsing related
- **mentoringLevel**: Mentoring level enum values
- **paymentType**: Payment method enum values
- **matches**: Match/mentorship request related
- **status**: Status labels (pending, accepted, etc.)
- **errors**: Error messages and error states
- **pagination**: Pagination controls
- **language**: Language selector

### Adding New Translations

When adding a new feature with user-facing text:

1. **Create translation keys** in both language files:
   ```json
   {
     "myFeature": {
       "title": "Feature Title",
       "description": "Feature description",
       "button": "Click me"
     }
   }
   ```

2. **Use the keys in components**:
   ```typescript
   const { t } = useTranslation();
   return <h1>{t('myFeature.title')}</h1>;
   ```

3. **Translation files to update**:
   - `src/react-app/i18n/locales/zh-CN/translation.json`
   - `src/react-app/i18n/locales/en/translation.json`

### Language Switcher

The app includes a **LanguageSwitcher** component (`src/react-app/components/LanguageSwitcher.tsx`) in the navbar that allows users to toggle between Chinese and English. User preference is automatically saved to localStorage and persists across sessions.

### Testing with i18n

The test environment is configured to use English translations by default for consistent test behavior. i18n is initialized in `vitest.setup.ts`:

```typescript
import i18n from './src/react-app/i18n';

// Initialize with English for tests
i18n.init();
i18n.changeLanguage('en');
```

When writing tests, use the actual translated English text:

```typescript
// ✅ Correct - uses actual English translation
expect(screen.getByText(/Browse Mentors/i)).toBeInTheDocument();

// ❌ Avoid - hardcoded text that might differ from translation
expect(screen.getByText(/Search mentors/i)).toBeInTheDocument();
```

### Performance Considerations

- **Lazy loading**: Translations are bundled with the app (not lazy-loaded per language)
- **Bundle size**: Translation JSON adds ~15KB gzipped total
- **Re-renders**: Language changes trigger re-renders only for components using `useTranslation()`
- **SSR**: Not applicable for this frontend-only app

### Key Statistics

- **Total translation keys**: ~100+ strings
- **Languages supported**: Chinese (zh-CN) and English (en)
- **Default UI language**: Simplified Chinese
- **Coverage**: All user-facing text across all pages and components

## Common Development Patterns

### Data Type Conversions

**SQLite Boolean Normalization:**

SQLite doesn't have a native boolean type—it stores booleans as INTEGER (0 or 1). When reading from the database, you need to convert these back to JavaScript booleans:

```typescript
// Problem: Database returns { available: 0 } but TypeScript expects boolean
// Solution: Normalize after reading from database

function normalizeMentorProfile(profile: unknown): MentorProfile {
  const dbProfile = profile as Record<string, unknown>;

  return {
    // ... other fields
    available: Boolean(dbProfile.available),        // Converts 0/1 to false/true
    accepting_new_mentees: Boolean(dbProfile.accepting_new_mentees),
  };
}
```

**JSON Field Parsing:**

Some fields (like `expertise_topics_custom`) are stored as JSON strings in SQLite. Always parse and validate:

```typescript
// In database: expertise_topics_custom = '["topic1", "topic2"]'
const expertise_topics_custom: string[] = [];
if (dbProfile.expertise_topics_custom) {
  try {
    const parsed = typeof dbProfile.expertise_topics_custom === 'string'
      ? JSON.parse(dbProfile.expertise_topics_custom as string)
      : dbProfile.expertise_topics_custom;
    expertise_topics_custom = Array.isArray(parsed) ? parsed : [];
  } catch {
    expertise_topics_custom = [];
  }
}
```

See `src/worker/index.ts:normalizeMentorProfile()` for the full example.

### Bit Flag Helpers

When working with bit flags, use the helper functions instead of manual bitwise operations:

```typescript
import {
  hasLevel,
  addLevel,
  removeLevel,
  getLevelNames
} from '../types/mentor';

// Check if mentor accepts entry-level mentees
if (hasLevel(mentor.mentoring_levels, MentoringLevel.Entry)) {
  // ...
}

// Add a new level to profile
profile.mentoring_levels = addLevel(
  profile.mentoring_levels,
  MentoringLevel.Senior
);

// Get human-readable names
const levels = getLevelNames(mentor.mentoring_levels); // ['Entry', 'Senior']
```

See `src/types/mentor.ts` for all available helpers.

### Error Handling Pattern

The API client automatically extracts error details from responses:

```typescript
// apiClient.ts handles error transformation
export async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(path, { /* ... */ });

  if (!response.ok) {
    const error = await response.json();
    throw {
      status: response.status,
      message: error.message || 'Unknown error',
      code: error.code,
    };
  }

  return response.json();
}

// In components:
try {
  const profile = await mentorService.getProfile(userId);
} catch (error) {
  if (error.status === 404) {
    // Handle not found
  } else if (error.status === 401) {
    // Handle unauthorized
  }
}
```

### Service Layer Pattern

All API interactions go through service layer for consistency:

```typescript
// ✅ Good: Use service layer (in mentorService.ts)
const profile = await mentorService.getProfile(userId);

// ❌ Bad: Direct API calls scattered in components
const response = await apiClient.get(`/api/v1/mentors/profiles/${userId}`);
```

Benefits:
- Centralized error handling
- Reusable business logic
- Easy to mock in tests
- Single source of truth for API endpoints

### Testing Database Queries

When testing worker endpoints that use D1:

```typescript
// Mock the database binding
const mockDb = {
  prepare: vi.fn((sql: string) => ({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(() => ({
      success: true,
      results: [/* mock data */]
    })),
    first: vi.fn(() => ({ /* mock data */ })),
    run: vi.fn(() => ({ success: true }),
  }))
};

// Pass to Hono context
const c = {
  env: {
    platform_db: mockDb,
    GOOGLE_CLIENT_ID: 'test-client',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    JWT_SECRET: 'test-secret',
  },
  req: new Request('http://localhost/api/v1/users'),
  var: vi.fn(),
};

// Test the endpoint
const response = await app.fetch(c.req, c.env);
```

## Database Schema Quick Reference

### Core Tables

**users**
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE
name TEXT
google_id TEXT
created_at INTEGER
updated_at INTEGER
```

**mentor_profiles**
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
bio TEXT
rate REAL
payment_types INTEGER (bit flags)
mentoring_levels INTEGER (bit flags)
availability TEXT (JSON)
expertise_domain TEXT
expertise_topics TEXT (JSON array)
expertise_topics_custom TEXT (JSON array)
available BOOLEAN
accepting_new_mentees BOOLEAN
created_at INTEGER
updated_at INTEGER
```

**matches**
```sql
id TEXT PRIMARY KEY
mentee_id TEXT (FOREIGN KEY to users)
mentor_id TEXT (FOREIGN KEY to users)
status TEXT (pending|accepted|active|completed)
requested_at INTEGER
responded_at INTEGER
completed_at INTEGER
notes TEXT
```

**user_roles**
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
role TEXT (admin|member)
created_at INTEGER
```

**user_points**
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
points INTEGER (default 0)
updated_at INTEGER
```

**Query Tips:**
- Use `WHERE status = 'accepted'` for active mentorships
- Join users for mentee/mentor names: `SELECT m.*, u.name as mentee_name ...`
- Check mentor availability: `WHERE available = 1 AND accepting_new_mentees = 1`
- Calculate rank: `SELECT RANK() OVER (ORDER BY points DESC) as rank FROM user_points`
- Initialize points on first access: `INSERT OR IGNORE INTO user_points (id, user_id, points, updated_at) VALUES (...)`

---

## Points System

### Overview

The Points System enables gamification by tracking user points and calculating leaderboard rankings. Points are awarded for various activities (completing challenges, publishing blogs, etc.) and displayed throughout the platform.

**Key Design Decisions:**
- **No Rank Column**: Rank is calculated on-the-fly using SQL window functions, avoiding expensive updates when points change
- **Auto-initialization**: Points records are created automatically on first access (GET endpoint)
- **Consistent Timestamps**: Uses Unix timestamps (seconds) for consistency with existing schema
- **Type Safety**: Shared types between frontend and backend in `src/types/points.ts`

### Database Schema

**user_points table:**
- `id` (TEXT PRIMARY KEY): Unique identifier
- `user_id` (TEXT UNIQUE FOREIGN KEY): Reference to users table
- `points` (INTEGER DEFAULT 0): Current point balance
- `updated_at` (INTEGER): Last update timestamp (Unix seconds)

**Indexes:**
- `idx_user_points_user_id`: Fast lookups by user
- `idx_user_points_points DESC`: Efficient leaderboard sorting

### API Endpoints

**GET /api/v1/users/:id/points** (Public)
- Returns user points with calculated rank
- Auto-creates points record (with 0 points) if doesn't exist
- Response includes rank calculated on-the-fly
```typescript
{
  id: string;
  user_id: string;
  points: number;
  updated_at: number;
  rank?: number; // Calculated position in leaderboard
}
```

**PATCH /api/v1/users/:id/points** (Admin Only)
- Updates user's total points
- Requires authentication and admin role
- Request body: `{ points: number }`
- Returns updated points with recalculated rank

### Frontend Components

**UserPointsBadge** (`src/react-app/components/UserPointsBadge.tsx`)
- Displays points with icon and optional rank
- Props: `points`, `rank`, `showRank`, `variant` (sm|md|lg), `showBadge`
- Color-coded based on points amount:
  - Gray (< 100 points)
  - Orange (100-499 points)
  - Blue (500-999 points)
  - Yellow (1000+ points)
- Responsive design and accessible ARIA labels

**Points Service** (`src/react-app/services/pointsService.ts`)
- `getUserPoints(userId)`: Fetch user points with rank
- `updateUserPoints(userId, points)`: Set points (admin only)
- `addPointsToUser(userId, pointsToAdd)`: Increment points
- `awardPointsForAction(userId, pointsToAward, action)`: Award with logging

### Helper Functions

Located in `src/types/points.ts`:
- `normalizeUserPoints()`: Ensure proper typing from database
- `formatPoints()`: Format with thousands separator (e.g., "1,000")
- `formatRank()`: Format with ordinal suffix (e.g., "1st", "2nd", "3rd")
- `getPointsColor()`: Get TailwindCSS color class for badge

### Testing

**Backend Tests** (`src/worker/__tests__/points.test.ts`):
- Type normalization from database
- Points formatting and color coding
- Database storage and updates
- Rank calculation
- Authorization checks

**Component Tests** (`src/react-app/__tests__/UserPointsBadge.test.tsx`):
- Component rendering at different sizes
- Rank display and formatting
- Color styling based on points
- Accessibility attributes
- Edge cases (zero points, large values, undefined rank)

### Integration Points

**User Types** (`src/types/user.ts`):
- Added optional `points?: number` field to User interface
- Added optional `points?: number` to AuthPayload for JWT tokens

**API Types** (`src/types/api.ts`):
- `GetUserPointsResponse`: Response from GET endpoint
- `UpdateUserPointsRequest`: Request body for PATCH endpoint
- `UserPointsResponse`: Simplified response structure

### Internationalization

Translations added to both English and Chinese:
- `points.title`: "Points System" / "积分系统"
- `points.label`: "Points" / "积分"
- `points.rank`: "Rank" / "排名"
- `points.howToEarn`: "How to Earn Points" / "如何赚取积分"
- `points.challengeCompletion`: "Complete a challenge" / "完成一个挑战"
- `points.blogPublish`: "Publish a blog post" / "发布一篇博客"
- `points.blogFeatured`: "Get your blog featured" / "获得你的博客被精选"
- `points.mentorshipComplete`: "Complete a mentorship" / "完成一次导师指导"

### Future Enhancements

When implementing future features that award points:
1. Fetch current points: `const current = await getUserPoints(userId)`
2. Award points: `await awardPointsForAction(userId, pointsAmount, 'action_name')`
3. Update JWT token in response to include new points count
4. Refresh UI to show updated points badge

Example from challenge completion:
```typescript
// Award points when challenge is approved
await awardPointsForAction(userId, challenge.points_reward, 'challenge_completion');
```

---

## Role-Based Access Control System

### Overview

The Role-Based Access Control (RBAC) system provides a simple two-tier permission model for the platform:
- **Admin**: Full administrative access to manage users, content, and platform settings
- **Member**: Regular user with basic access to community features (default role)

This system enables feature-gating and allows administrators to manage user permissions without code changes.

### Database Schema

**user_roles table** (created in migration 0007):
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY to users)
role TEXT (admin|member) -- CHECK constraint ensures valid values
created_at INTEGER
```

**Indexes:**
- `idx_user_roles_user_id`: Fast lookup by user
- `idx_user_roles_role`: Efficient role-based queries

**Design Notes:**
- One role per user (UNIQUE constraint on user_id)
- Role is required and defaults to 'member'
- Created timestamp for audit trail

### Type Definitions

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

### Backend API & Middleware

**API Endpoints:**

**POST /api/v1/roles** (Admin Only)
- Assign a role to a user
- Requires: Authentication + Admin role
- Request body: `{ user_id: string, role: UserRole }`
- Returns: Updated `UserRoleRecord`

**GET /api/v1/users/:id/role** (Public)
- Get user's role by user ID
- Response: `{ role: UserRole }`

**Middleware:**

`src/worker/auth/middleware.ts` provides role-based access control:

```typescript
// Check if user is authenticated
export const requireAuth = (c, next) => { ... }

// Check if user has admin role (requires auth + role verification)
export const requireAdmin = (c, next) => { ... }
```

**Usage in Routes:**

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

### Frontend Components

**UserRoleBadge** (`src/react-app/components/UserRoleBadge.tsx`)
- Displays user's role as a colored badge
- Props: `role: UserRole | undefined`, `className?: string`
- Variants:
  - Admin: Default badge color (prominent)
  - Member: Secondary badge color (subtle)
- Translatable: Uses i18n for role display names

**Usage Example:**

```typescript
import { UserRoleBadge } from './UserRoleBadge';
import { UserRole } from '../types/role';

export function UserProfile({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <UserRoleBadge role={user.role} />
    </div>
  );
}
```

### Integration with Authentication

Roles are checked at multiple points:

1. **JWT Token**: Role is included in JWT payload after login
2. **Middleware**: `requireAdmin` middleware validates role on each request
3. **UI Protection**: Frontend components conditionally render based on user's role

**First Admin Bootstrap:**

See "Bootstrapping First Admin User" section in Authentication System for instructions on creating the first admin user (requires direct database access).

### Testing

**Backend Tests:**
- Verify role assignment works (admin only)
- Test role retrieval for users
- Test middleware blocks unauthorized requests
- Test role changes are persisted

**Frontend Tests:**
- UserRoleBadge renders correct role
- Admin features hidden from member users
- Protected routes redirect unauthorized users

### Internationalization

Role names are translated in both English and Chinese:
```json
{
  "roles": {
    "admin": "Admin",
    "member": "Member"
  }
}
```

---

## Navigation Layout & Sidebar

### Overview

The platform uses a modern two-column layout with:
- **Sidebar**: Fixed or collapsible navigation menu (desktop: fixed, mobile: hidden)
- **Main Content**: Scrollable content area with responsive padding
- **Navbar**: Top navigation bar with branding and user controls

This layout provides clear information hierarchy and improves user navigation across multiple community features.

### Architecture

**Layout Component** (`src/react-app/components/Layout.tsx`)
- Two-column flex layout: `sidebar + main-content`
- Height: `calc(100vh - 56px)` (full screen minus navbar height)
- Main content: Scrollable with responsive padding
- Responsive: Sidebar collapses on mobile (hidden with `hidden md:flex`)

```typescript
<div className="flex h-[calc(100vh-56px)]">
  <Sidebar />  {/* Fixed width 256px */}
  <main className="flex-1 overflow-y-auto">
    {children}
  </main>
</div>
```

**Sidebar Component** (`src/react-app/components/Sidebar.tsx`)
- Fixed width: 256px (w-64)
- Three navigation sections with dividers
- Authentication-aware: Shows/hides items based on user status
- Responsive: Hidden on mobile (`hidden md:flex`)
- Accessibility: Uses semantic nav elements and ARIA attributes

### Navigation Sections

The sidebar organizes navigation into three distinct sections:

#### 1. Feed Section (Always Visible)
Public-facing community content:
- **Feed** (/) - Community posts and updates
- **Challenges** (/challenges) - Browse active challenges
- **Blogs** (/blogs) - Read community blog posts

#### 2. Member Area (Authenticated Only)
User-specific functionality (conditionally rendered):
- **My Profile** (/mentor/profile/setup) - Create/edit mentor profile
- **My Mentorships** (/matches) - View and manage mentorships
- **My Challenges** (/my-challenges) - Submit and track challenge progress
- **My Blogs** (/my-blogs) - Manage published blogs

#### 3. Links Section (Always Visible)
Miscellaneous public links:
- **Leaderboard** (/leaderboard) - View user rankings by points
- **Browse Mentors** (/mentors/browse) - Search mentor profiles

### Responsive Design

**Desktop (md breakpoint and above):**
- Sidebar visible and fixed
- Content fills remaining horizontal space
- Two-column layout maintained

**Mobile (below md breakpoint):**
- Sidebar hidden (`hidden md:flex`)
- Full-width content area
- Future: Hamburger menu toggle for mobile navigation (in navbar)

### Integration with App.tsx

The Layout component wraps all non-authentication routes:

```typescript
function AppContent() {
  const isAuthPage = /* check if login page */;

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Suspense fallback={<LoadingFallback />}>
        {!isAuthPage && (
          <Layout>
            <Routes>
              {/* All routes here get sidebar + main layout */}
            </Routes>
          </Layout>
        )}
      </Suspense>
    </>
  );
}
```

### Implementation Details

**NavSection Component** (internal):
- Reusable component for rendering section with title + links
- Filters links based on `requiresAuth` prop
- Applies active state styling based on current pathname
- Accessible: Uses proper semantic elements and ARIA attributes

**Link Styling:**
- Active link: Default button variant (highlighted)
- Inactive link: Ghost button variant (subtle)
- Icon + label with text truncation for long names
- Smooth transitions and hover states

### Internationalization

All navigation labels are translatable:
```json
{
  "navigation": {
    "feed": "Feed",
    "challenges": "Challenges",
    "blogs": "Blogs",
    "myProfile": "My Profile",
    "myMatches": "My Mentorships",
    "myChallenges": "My Challenges",
    "myBlogs": "My Blogs",
    "leaderboard": "Leaderboard",
    "memberArea": "Member Area"
  }
}
```

### Future Enhancements

- **Mobile Hamburger Menu**: Toggle sidebar on mobile using hamburger button in navbar
- **Collapsible Sections**: Allow users to collapse/expand section groups
- **User Preferences**: Remember user's sidebar state in localStorage
- **Admin Panel**: Add admin-only navigation section for management features
- **Breadcrumbs**: Add breadcrumb navigation in main content area

## Debugging and Monitoring

### Local Development Logging

Use `console.log()` or `console.error()` in Worker code—output appears in terminal:

```typescript
app.get('/api/v1/users/:id', async (c) => {
  const userId = c.req.param('id');
  console.log('Fetching user:', userId);  // Shows in terminal

  const user = await db.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  console.error('Query error:', error);    // Error output
  return c.json(user);
});
```

Run `npm run dev` and check the terminal output.

### Production Logging

Monitor Cloudflare Worker logs:

```bash
# Stream live logs from your deployed worker
npx wrangler tail --format json

# Filter for specific error level
npx wrangler tail --status error
```

### Testing Database Locally

View your local database using D1 CLI:

```bash
# List all tables
npm run db:schema

# Execute raw SQL query
wrangler d1 execute platform-db-local --local --command "SELECT COUNT(*) FROM mentor_profiles;"

# Export database
wrangler d1 execute platform-db-local --local --command "SELECT * FROM users;" > users_export.sql
```

### Frontend Debugging

**React DevTools:**
- Check AuthContext state in React DevTools
- Verify localStorage tokens: `localStorage.getItem('authToken')`
- Check network tab for API requests and responses

**Common Issues:**
```typescript
// Issue: Component not re-rendering after token update
// Solution: Ensure useAuth hook is called correctly
const { user, login, logout } = useAuth();  // ✅ Correct

// Issue: 401 errors on protected routes
// Check: Is token stored in localStorage?
// Check: Is apiClient attaching token to requests?
console.log(localStorage.getItem('authToken'));
```

### Performance Monitoring

**Database Query Performance:**

For slow queries, check:
1. Are you selecting only needed columns? (Not `SELECT *`)
2. Do relevant columns have indexes?
3. Are you using bit flag queries efficiently?

```typescript
// ✅ Good: Select only needed fields
const results = await db.prepare(`
  SELECT id, name, rate FROM mentor_profiles WHERE available = 1
`).all();

// ❌ Avoid: Selecting all fields
const results = await db.prepare(`
  SELECT * FROM mentor_profiles
`).all();
```

**Bundle Size:**

Check your build output after `npm run build`:
- Frontend bundle is in `dist/client/`
- Worker bundle is in `dist/worker/`
- Translation JSON is ~15KB gzipped (acceptable)

View build analysis:
```bash
npm run build
# Check dist/ directory sizes
ls -lh dist/client/assets/
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'react'` | Run `npm install` to ensure all deps installed |
| `D1 database not found` | Run `npm run db:migrate` to apply migrations |
| Tests failing with "Cannot find X" | Check that test files import from correct path using `@/` alias |
| API returning 401 | Check JWT token in localStorage, may be expired (7 day default) |
| Component showing Chinese text instead of English | Set i18n language via LanguageSwitcher or check localStorage `i18nextLng` |
| Type errors in TypeScript | Run `npm run build` to check all three tsconfig projects |
