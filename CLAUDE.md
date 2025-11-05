# CLAUDE.md

Guidance for Claude Code when working with the Lead Forward Platform.

## Project Overview

**Lead Forward Platform** - An NGO community website built with React + Vite + Hono + Cloudflare Workers. Full-stack application deployed to Cloudflare's edge network, supporting mentor-mentee matching and community features.

## Development Commands

```bash
npm install                     # Install dependencies
npm run dev                     # Start dev server with HMR
npm run build                   # Build for production
npm run test                    # Run all tests
npm run test:watch             # Watch mode
npm run lint -- --fix          # Auto-fix linting
npm run quality-check          # Lint + test + build (all-in-one)
npm run deploy                  # Deploy to Cloudflare
npm run db:migrate             # Apply local migrations
npm run db:schema              # Show local database schema
npx wrangler tail              # Monitor production logs
```

**Note:** When working in Claude Code, linting, type-checking, and tests run automatically via hooks (see docs/HOOKS.md for details).

## Test-Driven Development Workflow

This project follows Test-Driven Development (TDD): **Always write tests before implementing features or fixing bugs.**

### TDD Cycle: Red-Green-Refactor

1. **Red**: Write a failing test describing desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Test Organization

Tests are colocated with source files in `__tests__` directories:

```
src/react-app/__tests__/           # React component tests (jsdom environment)
src/worker/__tests__/              # API route tests (node environment)
```

**Test Environments:**

The project uses Vitest with two separate environments configured in `vitest.config.ts`:

- **React tests** (`--project=react`): `jsdom` environment for component and browser API tests
- **Worker tests** (`--project=worker`): `node` environment for API route and server-side logic tests

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: Use `describe()` to group related tests
- Test cases: Use `it()` with clear, descriptive names
- Example: `it('should return 404 when resource not found')`

### Testing React Components

Use React Testing Library. Test user-facing behavior, not implementation:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render greeting', () => {
    render(<MyComponent name="World" />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });
});
```

### Testing API Routes

Test all HTTP methods, error cases, validation, and auth flows:

```typescript
import { describe, it, expect } from 'vitest';
import app from './index';

describe('API Routes', () => {
  it('GET /api/v1/health returns 200', async () => {
    const req = new Request('http://localhost/api/v1/health');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });
});
```

### Before Committing

```bash
npm run quality-check   # Ensures lint, tests, and build all pass
```

### Coverage Goals

- **>80% code coverage** for critical paths
- **100% coverage** for business logic and API handlers
- View report: `npm run test:coverage`

## Architecture

### Project Structure

Three distinct TypeScript projects using project references:

1. **React App** (`src/react-app/`)
   - Entry: `src/react-app/main.tsx`
   - Config: `tsconfig.app.json`
   - Target: ES2020 with DOM

2. **Cloudflare Worker** (`src/worker/`)
   - Entry: `src/worker/index.ts`
   - Framework: Hono
   - Config: `tsconfig.worker.json`

3. **Shared Types** (`src/types/`)
   - Type definitions used by both frontend and backend
   - Files: `user.ts`, `mentor.ts`, `match.ts`, `api.ts`, `points.ts`, `role.ts`

### Build and Deployment

1. **Development**: `npm run dev` starts Vite with HMR for frontend and worker
2. **Build**: `tsc -b && vite build` compiles all TypeScript projects
3. **Deploy**: Wrangler publishes worker to Cloudflare's edge network

### Frontend-Backend Communication

- Frontend makes API calls to `/api/*` routes
- Backend (Hono) handles these routes in `src/worker/index.ts`
- Both served from same Cloudflare Worker
- Static assets with SPA fallback routing

### API Versioning

All API endpoints MUST use `/api/v1/` prefix:
- ✅ Good: `/api/v1/users`, `/api/v1/mentors/profiles`
- ❌ Bad: `/api/users`, `/api/mentors`

This allows future API changes without breaking clients.

### API Client Pattern

- `src/react-app/services/apiClient.ts`: Base API client with request/response handling
- Service layer: `mentorService.ts`, `matchService.ts`, etc. wrap API calls
- Benefits: Centralized error handling, type safety, easy to mock, single source of truth

Example:
```typescript
export const mentorService = {
  async getProfile(userId: string): Promise<MentorProfile> {
    return apiClient.get(`/api/v1/mentors/profiles/${userId}`);
  },
};
```

## Database (Cloudflare D1)

### Configuration

Local D1 database stored in `.wrangler/state/d1/` (used automatically with `npm run dev`).

Add D1 bindings to `wrangler.json`:
```json
{
  "d1_databases": [
    {
      "binding": "platform_db",
      "database_name": "platform-db",
      "database_id": "your-id"
    }
  ]
}
```

Regenerate types after changes: `npm run cf-typegen`

### Migrations

This project uses **Cloudflare D1's native migration system** which tracks applied migrations in a `d1_migrations` table.

**Migration Files:**
- Located in `migrations/` directory
- Name format: `0001_description.sql`, `0002_description.sql`, etc.
- All SQLite syntax with idempotent DDL (`IF NOT EXISTS`, etc.)

**Commands:**

```bash
npm run db:migrate              # Apply local migrations
npm run db:schema               # Show local schema
npm run db:migrate:prod         # Apply production migrations
npm run db:schema:prod          # Show production schema
npm run db:list                 # List applied migrations
```

**Best Practices:**
- ✅ Create new migrations for each schema change (never edit existing ones)
- ✅ Write idempotent SQL using `IF NOT EXISTS`
- ✅ Test migrations locally before production
- ❌ Don't edit or delete migrations after they're applied
- ⚠️ Always test locally first; production migrations impact live users

**Reset Local Database (Development Only):**
```bash
rm -rf .wrangler/state/d1/     # Delete local D1
npm run db:migrate             # Re-run all migrations
```

### Using Database in Worker Code

```typescript
app.get('/api/v1/users', async (c) => {
  const db = c.env.platform_db;
  const result = await db.prepare('SELECT * FROM users').all();
  return c.json(result.results);
});
```

### Testing with Database Mocks

```typescript
const mockDb = {
  prepare: vi.fn((sql: string) => ({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(() => ({ success: true, results: [] })),
    first: vi.fn(() => ({})),
    run: vi.fn(() => ({ success: true })),
  }))
};

const c = {
  env: { platform_db: mockDb },
  req: new Request('http://localhost/api/v1/users'),
};

const response = await app.fetch(c.req, c.env);
```

## Authentication System

The platform uses **Google OAuth 2.0** with **JWT tokens** for stateless, edge-compatible session management.

### Setup

See `GOOGLE_OAUTH_SETUP.md` for step-by-step instructions to:
1. Create a Google Cloud Console project
2. Set up OAuth credentials
3. Configure redirect URIs for local and production
4. Add environment variables

### Architecture

**Backend** (`src/worker/auth/`):
- `jwt.ts` - JWT token creation/verification using `jose`
- `middleware.ts` - Auth middleware extracting and validating JWT
- `google.ts` - Google OAuth flow (login URL, code exchange, profile fetch)

**Routes:**
- `GET /api/v1/auth/google/login` - Returns Google OAuth login URL
- `GET /api/v1/auth/google/callback` - Handles OAuth callback, exchanges code for token
- `GET /api/v1/auth/me` - Returns current authenticated user
- `POST /api/v1/auth/logout` - Logout endpoint (frontend clears token)

**Frontend** (`src/react-app/`):
- `context/AuthContext.tsx` - Auth state and `useAuth()` hook
- `pages/LoginPage.tsx` - Login page with "Sign in with Google" button
- `pages/OAuthCallbackPage.tsx` - Handles OAuth redirect
- `components/ProtectedRoute.tsx` - Route wrapper requiring authentication
- `services/apiClient.ts` - Automatically attaches JWT to API requests

**Database:**
- Users table includes `google_id` column (stores Google's user ID)
- Enables account linking when signing up with same email

### JWT Token Format

```typescript
{
  userId: string;      // From database
  email: string;
  name: string;
  iat: number;         // Issued at (Unix timestamp)
  exp: number;         // Expires at (7 days default)
}
```

Token stored in localStorage and sent with all API requests: `Authorization: Bearer <token>`

### Protected Routes

**Protected API Routes (authentication required):**
- All mentor profile routes: `GET/POST/PUT/DELETE /api/v1/mentors/profiles/*`
- All match routes: `GET/POST/PATCH/DELETE /api/v1/matches*`

**Protected Frontend Routes:**
- `/mentors/browse` - Browse and search mentors
- `/mentors/:id` - View mentor detail page
- `/mentor/profile/setup` - Create mentor profile
- `/matches` - View matches

**Frontend Protection:** `ProtectedRoute` wrapper redirects unauthenticated users to `/login`

### Environment Variables

**Local** (in `wrangler.json` env.local):
```json
"vars": {
  "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret",
  "JWT_SECRET": "dev-secret-key"
}
```

**Production** (via `wrangler secret put`):
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

### Bootstrapping First Admin User

See docs/RBAC.md for detailed instructions on creating the first admin user using direct SQL commands.

### Security Considerations

**Strengths:**
- No passwords stored
- OAuth credentials never exposed to frontend
- JWT tokens are short-lived (7 days default)
- Stateless design scales with edge computing

**Recommendations:**
- Use HTTPS (enforced by Cloudflare)
- Set strong JWT_SECRET via `wrangler secret put`
- Rotate JWT_SECRET periodically for production
- Monitor login attempts for suspicious patterns
- Consider rate limiting on `/api/v1/auth/*` endpoints

## Project-Specific Patterns

### Bit Flags for Database Efficiency

Mentor-mentee matching uses bit flags for storing multiple selections as integers:

```typescript
enum MentoringLevel {
  Entry = 1,       // 2^0
  Senior = 2,      // 2^1
  Staff = 4,       // 2^2
  Management = 8   // 2^3
}

// Use helper functions instead of manual bitwise operations:
if (hasLevel(mentor.mentoring_levels, MentoringLevel.Senior)) { ... }
const updated = addLevel(profile.mentoring_levels, MentoringLevel.Staff);
```

**Benefits:** Faster database queries, efficient indexing, smaller storage footprint

**Implementation:** See `src/types/mentor.ts` for helpers: `hasLevel()`, `addLevel()`, `removeLevel()`, `getLevelNames()`

### User-Driven Matching

The platform uses **mentee-initiated** matching (not algorithm-based):
- Mentees browse and search mentor profiles
- Mentees send match requests (creates `pending` status)
- Mentors accept or reject
- Match progresses: `pending` → `accepted` → `active` → `completed`

This keeps UX simple and gives users full control.

### LinkedIn Profile Integration

Mentors can optionally add LinkedIn profile URL to mentor profile.

**Features:**
- Optional field in mentor profile setup/edit
- URL validation (must match `https://(www.)?linkedin.com/in/username`)
- Displayed on mentor detail page with LinkedIn icon
- Links open in new tab with security attributes (`target="_blank" rel="noopener noreferrer"`)

**Implementation:**
- Database: `linkedin_url` column in `mentor_profiles` (TEXT, nullable)
- Backend validation: Regex pattern in `src/worker/index.ts`
- Frontend: Input field in `src/react-app/pages/MentorProfileSetup.tsx`
- Migration: `migrations/0012_add_linkedin_url_to_mentor_profiles.sql`

### Data Type Conversions

**SQLite Boolean Normalization:**

SQLite stores booleans as INTEGER (0 or 1). Always convert after reading:

```typescript
function normalizeMentorProfile(profile: unknown): MentorProfile {
  const dbProfile = profile as Record<string, unknown>;
  return {
    available: Boolean(dbProfile.available),  // 0/1 → false/true
    accepting_new_mentees: Boolean(dbProfile.accepting_new_mentees),
  };
}
```

**JSON Field Parsing:**

Some fields (like `expertise_topics_custom`) are stored as JSON strings. Always parse:

```typescript
const expertise_topics_custom: string[] = [];
if (dbProfile.expertise_topics_custom) {
  try {
    const parsed = JSON.parse(dbProfile.expertise_topics_custom as string);
    expertise_topics_custom = Array.isArray(parsed) ? parsed : [];
  } catch {
    expertise_topics_custom = [];
  }
}
```

### Error Handling Pattern

API client automatically extracts error details:

```typescript
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

All API interactions go through service layer:

```typescript
// ✅ Good: Use service layer
const profile = await mentorService.getProfile(userId);

// ❌ Bad: Direct API calls scattered in components
const response = await apiClient.get(`/api/v1/mentors/profiles/${userId}`);
```

Benefits: Centralized error handling, reusable business logic, easy to mock, single source of truth.

## Database Schema Quick Reference

**users** - User accounts
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE
name TEXT
google_id TEXT
created_at INTEGER
updated_at INTEGER
```

**mentor_profiles** - Mentor information
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
linkedin_url TEXT
available BOOLEAN
accepting_new_mentees BOOLEAN
created_at INTEGER
updated_at INTEGER
```

**matches** - Mentorship requests and relationships
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

**user_roles** - Role-based access control
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
role TEXT (admin|member)
created_at INTEGER
```

**user_points** - User points and rankings
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
points INTEGER (default 0)
updated_at INTEGER
```

**Query Tips:**
- Active mentorships: `WHERE status = 'accepted'`
- Join users for names: `SELECT m.*, u.name as mentee_name ...`
- Check availability: `WHERE available = 1 AND accepting_new_mentees = 1`
- Calculate rank: `SELECT RANK() OVER (ORDER BY points DESC) as rank FROM user_points`

## Key Features

### Points System & Gamification

See **docs/POINTS_SYSTEM.md** for complete details on:
- Point awards for content creation and engagement
- Diminishing returns anti-spam system
- Leaderboard rankings and UI components
- Post engagement point tracking

### Role-Based Access Control

See **docs/RBAC.md** for complete details on:
- Two-tier permission model (Admin/Member)
- Role assignment and checking
- Protected routes and middleware
- Bootstrapping first admin user

### Internationalization (i18n)

See **docs/I18N.md** for complete details on:
- Multi-language support (Chinese/English)
- Translation key organization
- Adding new translations
- Language switching and testing

### Claude Code Hooks

See **docs/HOOKS.md** for details on automated quality checks:
- Automatic linting, building, and testing during Claude Code sessions
- Hook configuration and performance tips
- Troubleshooting hook failures

## Debugging & Support

See **docs/TROUBLESHOOTING.md** for:
- Quick reference table of common issues
- Detailed debugging techniques
- Database inspection commands
- Performance monitoring and optimization
- Development workflow best practices

## Key Dependencies

- **Hono**: Web framework for Cloudflare Worker backend
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **@cloudflare/vite-plugin**: Cloudflare Workers integration
- **Wrangler**: Cloudflare's CLI for Workers deployment
- **jose**: JWT token creation and verification
- **react-i18next**: Internationalization framework
- **Vitest**: Test framework with jsdom and node environments

## Common Development Patterns

### Testing Database Queries (Worker Tests)

When testing D1 database interactions, mock the D1 binding:

```typescript
const mockDb = {
  prepare: vi.fn((sql: string) => ({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(() => ({ success: true, results: [] })),
  }))
};

const c = { env: { platform_db: mockDb }, var: vi.fn() };
const response = await app.fetch(new Request('http://localhost/api/v1/users'), c.env);
```

### Running Tests During Development

1. Start test watcher: `npm run test:watch`
2. Write test first, implement feature, refactor while keeping tests green
3. Run `npm run quality-check` before committing

## Quick Troubleshooting

For common issues and solutions, see **docs/TROUBLESHOOTING.md**. Key commands:

```bash
npm run build              # Type-check all three TypeScript projects
npm run db:schema          # View local database schema
npm run test               # Run full test suite
npx wrangler tail          # Stream production logs
```
