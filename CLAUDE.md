# CLAUDE.md

Guidance for Claude Code when working with the Lead Forward Platform.

## Project Overview

**Lead Forward Platform** - An NGO community website built with React + Vite + Hono + Cloudflare Workers. Full-stack application deployed to Cloudflare's edge network, supporting mentor-mentee matching, forum discussions, challenges, blogs, and community features.

**Architecture:**
- **Frontend**: React 19 + Vite (SPA)
- **Backend**: Hono (Cloudflare Worker)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google OAuth 2.0 + JWT
- **Deployment**: Cloudflare Workers (edge network)

## Quick Start Commands

```bash
npm install                     # Install dependencies
npm run dev                     # Start dev server with HMR
npm run build                   # Build for production
npm run test                    # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report
npm run lint -- --fix          # Auto-fix linting
npm run quality-check          # Lint + test + build (all-in-one)
npm run deploy                  # Deploy to Cloudflare
npm run db:migrate             # Apply local migrations
npm run db:schema              # Show local database schema
npx wrangler tail              # Monitor production logs
```

**Note:** When working in Claude Code, linting, type-checking, and tests run automatically via hooks (see docs/HOOKS.md).

## Test-Driven Development (TDD)

### Core Principle

**This project requires Test-Driven Development for ALL new features and bug fixes.** TDD is not optional - it's how we maintain code quality and prevent regressions.

### Why TDD Matters

1. **Confidence**: Tests prove code works before it reaches users
2. **Design**: Writing tests first leads to better API design
3. **Documentation**: Tests serve as living documentation
4. **Refactoring**: Change code fearlessly with test safety net
5. **Debugging**: Failed tests pinpoint exact issues immediately

### TDD Cycle: Red-Green-Refactor

1. **Red**: Write a failing test describing desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Enforced Coverage Requirements

**IMPORTANT:** Tests are enforced via coverage thresholds in `vitest.config.ts`:

- **React code**: 85% statements/functions/lines, 80% branches
- **Worker code**: 100% statements/branches/functions/lines

Builds will **FAIL** if coverage drops below these thresholds. This ensures:
- All API routes have comprehensive tests
- Business logic is fully covered
- Auth flows are tested
- Database interactions are verified

### Test Organization

Tests are colocated with source files in `__tests__` directories:

```
src/react-app/__tests__/           # React component tests (jsdom environment)
src/worker/__tests__/              # API route tests (node environment)
```

**Test Environments:**
- **React tests** (`--project=react`): jsdom environment for components and browser APIs
- **Worker tests** (`--project=worker`): node environment for API routes and server logic

### Writing Good Tests

**Naming Convention:**
- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: `describe('FeatureName', () => { ... })`
- Test cases: `it('should do specific behavior when condition', () => { ... })`

**React Components** - Test user-facing behavior:
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should render greeting with provided name', () => {
    render(<MyComponent name="World" />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });
});
```

**API Routes** - Test all methods, error cases, validation, auth:
```typescript
import { describe, it, expect, vi } from 'vitest';
import app from './index';

describe('GET /api/v1/resource', () => {
  it('should return 200 with valid data', async () => {
    const mockDb = { prepare: vi.fn(/* ... */) };
    const req = new Request('http://localhost/api/v1/resource');
    const res = await app.fetch(req, { platform_db: mockDb });
    expect(res.status).toBe(200);
  });

  it('should return 404 when resource not found', async () => {
    // Test error case
  });
});
```

**Database Mocking Pattern:**
See existing test files for examples: `src/worker/__tests__/challenges.test.ts`, `src/worker/__tests__/forum.test.ts`

### Before Committing

```bash
npm run quality-check   # Ensures lint, tests, and build all pass
```

Tests run automatically during Claude Code sessions via hooks. Always ensure they pass before committing.

## Architecture

### Project Structure

Three distinct TypeScript projects using project references:

1. **React App** (`src/react-app/`)
   - Entry: `main.tsx`
   - Config: `tsconfig.app.json`
   - Components, pages, hooks, context, services

2. **Cloudflare Worker** (`src/worker/`)
   - Entry: `index.ts`
   - Framework: Hono
   - Config: `tsconfig.worker.json`
   - API routes, auth, database queries

3. **Shared Types** (`src/types/`)
   - Type definitions shared between frontend and backend
   - See directory for all available types

### API Versioning

All API endpoints MUST use `/api/v1/` prefix:
- ✅ Good: `/api/v1/users`, `/api/v1/forum/threads`
- ❌ Bad: `/api/users`, `/api/forum`

### Service Layer Pattern

All API interactions go through service layer (`src/react-app/services/`):

```typescript
// ✅ Good: Use service layer
const threads = await forumService.getThreads(categoryId);

// ❌ Bad: Direct API calls in components
const response = await apiClient.get('/api/v1/forum/threads');
```

Benefits: Centralized error handling, type safety, easy to mock, single source of truth.

## Key Features

### Feature Matrix

| Feature | Status | Key Tables | Test Coverage | API Prefix |
|---------|--------|------------|---------------|------------|
| **Authentication** | ✅ | users, user_roles | ✅ 100% | /api/v1/auth/* |
| **Mentor Matching** | ✅ | mentor_profiles, matches | ✅ 100% | /api/v1/mentors/* |
| **Forum System** | ✅ | forum_*, forum_thread_tags | ✅ 100% | /api/v1/forum/* |
| **Challenges** | ✅ | challenges, challenge_* | ✅ 100% | /api/v1/challenges/* |
| **Blogs** | ✅ | blogs, blog_likes, blog_comments | ✅ 100% | /api/v1/blogs/* |
| **Points & Gamification** | ✅ | user_points, point_actions_log | ✅ 100% | /api/v1/points/* |
| **Feature Flags** | ✅ | feature_flags | ✅ | /api/v1/features/* |

### Authentication System

**Google OAuth 2.0 + JWT** for stateless, edge-compatible session management.

**Key Components:**
- Backend: `src/worker/auth/` (jwt.ts, middleware.ts, google.ts)
- Frontend: `context/AuthContext.tsx`, `components/ProtectedRoute.tsx`
- Token storage: localStorage
- Token format: `{ userId, email, name, iat, exp }` (7-day expiry)

**Protected Routes:**
- API: All `/api/v1/mentors/*`, `/api/v1/matches/*`, `/api/v1/forum/*`, `/api/v1/challenges/*`
- Frontend: `/mentors/*`, `/forum/*`, `/challenges/*`, `/profile/*`

**Environment Variables:**
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth secret
- `JWT_SECRET`: Token signing secret

**Setup:** Configure Google Cloud Console OAuth 2.0 credentials with redirect URIs for local and production environments. Set environment variables in `wrangler.json` (local) or via `wrangler secret put` (production).

### Mentor Matching System

**User-driven matching** (not algorithm-based):
- Mentees browse and search mentor profiles
- Mentees send match requests → `pending` status
- Mentors accept/reject → `accepted`/`rejected` status
- Match progression: `pending` → `accepted` → `active` → `completed`

**Bit Flags for Database Efficiency:**
```typescript
// Storing multiple selections as integers
enum MentoringLevel {
  Entry = 1,       // 2^0
  Senior = 2,      // 2^1
  Staff = 4,       // 2^2
  Management = 8   // 2^3
}

// Use helper functions (see src/types/mentor.ts)
if (hasLevel(mentor.mentoring_levels, MentoringLevel.Senior)) { ... }
```

### Forum System

**Community discussion platform** replacing legacy posts system.

**Key Features:**
- Categories, threads, replies
- Thread tagging and categorization
- Voting system (upvotes/downvotes)
- View tracking
- Points awarded for participation

**Implementation:**
- Tables: `forum_categories`, `forum_threads`, `forum_replies`, `forum_votes`, `forum_thread_views`, `forum_thread_tags`
- API: `/api/v1/forum/*`
- Frontend: `src/react-app/pages/forum/*`

### Challenges System

**Gamified challenges** for community engagement.

**Key Features:**
- Create and manage challenges
- User participation tracking
- Submission and evaluation
- Points rewards for completion
- Status tracking: `draft` → `active` → `completed` → `cancelled`

**Implementation:**
- Tables: `challenges`, `challenge_participants`, `challenge_submissions`
- API: `/api/v1/challenges/*`
- Frontend: `src/react-app/pages/ChallengesPage.tsx`, `ChallengeDetailPage.tsx`
- Admin: `src/react-app/pages/admin/AdminChallengesPage.tsx`

### Blog System

**Content creation platform** for community members.

**Key Features:**
- Create, edit, publish blogs
- Like and comment system
- Author attribution
- Points for content creation

**Implementation:**
- Tables: `blogs`, `blog_likes`, `blog_comments`
- API: `/api/v1/blogs/*`
- Frontend: `src/react-app/pages/blogs/*`

### Points System & Gamification

**Engagement reward system** with diminishing returns anti-spam.

**Features:**
- Point awards for content creation and engagement
- Leaderboard rankings
- Diminishing returns for repeated actions
- Action logging for transparency

**Implementation:**
- Tables: `user_points`, `point_actions_log`
- API: `/api/v1/points/*`
- Details: See docs/POINTS_SYSTEM.md

### Role-Based Access Control (RBAC)

**Two-tier permission model**: Admin and Member roles.

**Features:**
- Role-based middleware protection
- Admin-only routes for challenges, feature flags
- Role checking via `requireRole()` middleware

**Implementation:**
- Table: `user_roles`
- Middleware: `src/worker/rbac/middleware.ts`
- Details: See docs/RBAC.md

### Internationalization (i18n)

**Multi-language support**: Chinese and English.

**Implementation:**
- Framework: react-i18next
- Translations: `src/react-app/locales/`
- Usage: `useTranslation()` hook
- Details: See docs/I18N.md

## Database (Cloudflare D1)

### Configuration

Local database: `.wrangler/state/d1/` (automatically used with `npm run dev`)

**Bindings** (`wrangler.json`):
```json
{
  "d1_databases": [{
    "binding": "platform_db",
    "database_name": "platform-db",
    "database_id": "your-id"
  }]
}
```

### Migrations

**Cloudflare D1's native migration system** with `d1_migrations` tracking table.

**Commands:**
```bash
npm run db:migrate              # Apply local migrations
npm run db:schema               # Show local schema
npm run db:migrate:prod         # Apply production migrations (CAUTION)
npm run db:schema:prod          # Show production schema
npm run db:list                 # List applied migrations
```

**Best Practices:**
- ✅ Create new migrations for each schema change
- ✅ Write idempotent SQL (`IF NOT EXISTS`, etc.)
- ✅ Test locally before production
- ❌ Never edit migrations after they're applied
- ⚠️ Production migrations impact live users - always test first

**Migration Files:**
- Location: `migrations/`
- Format: `0001_description.sql`, `0002_description.sql`, etc.
- Syntax: SQLite with idempotent DDL

**Reset Local Database** (development only):
```bash
rm -rf .wrangler/state/d1/ && npm run db:migrate
```

### Database Schema Quick Reference

**Core Tables:**

**users** - User accounts
```sql
id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, google_id TEXT,
created_at INTEGER, updated_at INTEGER
```

**user_roles** - Role-based access control
```sql
id TEXT PRIMARY KEY, user_id TEXT UNIQUE (FK), role TEXT (admin|member),
created_at INTEGER
```

**user_points** - Points and rankings
```sql
id TEXT PRIMARY KEY, user_id TEXT UNIQUE (FK), points INTEGER DEFAULT 0,
updated_at INTEGER
```

**point_actions_log** - Point tracking and transparency
```sql
id TEXT PRIMARY KEY, user_id TEXT (FK), action_type TEXT, points_awarded INTEGER,
created_at INTEGER
```

**mentor_profiles** - Mentor information
```sql
id TEXT PRIMARY KEY, user_id TEXT UNIQUE (FK), bio TEXT, rate REAL,
payment_types INTEGER (bit flags), mentoring_levels INTEGER (bit flags),
availability TEXT (JSON), expertise_domain TEXT, expertise_topics TEXT (JSON),
linkedin_url TEXT, available BOOLEAN, accepting_new_mentees BOOLEAN,
created_at INTEGER, updated_at INTEGER
```

**matches** - Mentorship requests and relationships
```sql
id TEXT PRIMARY KEY, mentee_id TEXT (FK), mentor_id TEXT (FK),
status TEXT (pending|accepted|active|completed),
requested_at INTEGER, responded_at INTEGER, completed_at INTEGER, notes TEXT
```

**Forum Tables:**
- `forum_categories` - Forum categories
- `forum_threads` - Discussion threads
- `forum_replies` - Thread replies
- `forum_votes` - Upvotes/downvotes
- `forum_thread_views` - View tracking
- `forum_thread_tags` - Thread tagging

**Challenge Tables:**
- `challenges` - Challenge definitions
- `challenge_participants` - User participation
- `challenge_submissions` - User submissions

**Blog Tables:**
- `blogs` - Blog posts
- `blog_likes` - Like tracking
- `blog_comments` - Comments

**Other Tables:**
- `feature_flags` - Feature toggle system

**View Complete Schema:** `npm run db:schema`

### Using Database in Worker Code

```typescript
app.get('/api/v1/resource', async (c) => {
  const db = c.env.platform_db;
  const result = await db.prepare('SELECT * FROM table WHERE id = ?')
    .bind(id)
    .all();
  return c.json(result.results);
});
```

**SQLite Boolean Normalization:**
SQLite stores booleans as INTEGER (0 or 1). Always convert:
```typescript
const normalized = {
  available: Boolean(dbRow.available),  // 0/1 → false/true
};
```

### Testing with Database Mocks

See test files for examples: `src/worker/__tests__/challenges.test.ts`, `src/worker/__tests__/forum.test.ts`

## Development Patterns

### Error Handling

API client (`src/react-app/services/apiClient.ts`) automatically extracts error details:

```typescript
try {
  const data = await forumService.getThreads(categoryId);
} catch (error) {
  if (error.status === 404) {
    // Handle not found
  } else if (error.status === 401) {
    // Handle unauthorized
  }
}
```

### Avoid Over-Engineering

- Only make changes directly requested or clearly necessary
- Don't add features, refactor code, or make "improvements" beyond scope
- Don't add docstrings/comments to unchanged code
- Don't add error handling for scenarios that can't happen
- Don't create helpers/utilities for one-time operations
- Three similar lines > premature abstraction

### Backwards Compatibility

Avoid backwards-compatibility hacks:
- ❌ Renaming unused `_vars`
- ❌ Re-exporting types that aren't used
- ❌ Adding `// removed` comments
- ✅ If something is unused, delete it completely

## Clean Code Standards

### Core Principle

**All code must be clean, readable, and maintainable.** These standards apply to:
- **All new code** - Must follow these principles from the start
- **Existing code when you touch it** - Opportunistic refactoring when making changes

Clean code reduces bugs, improves maintainability, and makes the codebase easier to understand for all contributors.

### Naming Conventions

**Variables and Functions** - Use descriptive names that reveal intent:
```typescript
// ✅ Good: Clear intent
const activeUsers = await getUsersByRole('member');
const isAuthenticated = verifyToken(token);
const totalPoints = calculateUserPoints(userId);

// ❌ Bad: Unclear intent
const users = await get('member');
const auth = check(token);
const pts = calc(userId);
```

**Avoid Generic Names:**
- ❌ Bad: `data`, `info`, `temp`, `tmp`, `result`, `item`, `obj`
- ✅ Good: `userData`, `profileInfo`, `cachedThread`, `forumThread`, `userProfile`

**Boolean Variables** - Prefix with question words:
```typescript
// ✅ Good: Reads like a question
const isActiveUser = user.status === 'active';
const hasAdminRole = user.roles.includes('admin');
const shouldRedirect = !isAuthenticated;
const canEditThread = thread.author_id === user.id;

// ❌ Bad: Doesn't read like a boolean
const activeUser = user.status === 'active';
const adminRole = user.roles.includes('admin');
const redirect = !isAuthenticated;
```

**Functions** - Use verbs for actions, nouns for accessors:
```typescript
// ✅ Good: Clear action verbs
async function createUser(userData: CreateUserInput) { ... }
async function deleteThread(threadId: string) { ... }
function validateEmail(email: string): boolean { ... }

// ✅ Good: Accessor patterns
function getUserProfile(userId: string) { ... }
function getActiveThreads(categoryId: string) { ... }

// ❌ Bad: Unclear or generic
async function user(data: any) { ... }
async function thread(id: string) { ... }
function email(e: string): boolean { ... }
```

**Constants** - Use UPPER_SNAKE_CASE for true constants:
```typescript
const MAX_THREAD_TITLE_LENGTH = 200;
const DEFAULT_POINTS_PER_POST = 10;
const JWT_EXPIRY_DAYS = 7;
```

### Function Size and Complexity

**Single Responsibility Principle** - Each function should do ONE thing well:
```typescript
// ❌ Bad: Too many responsibilities (validation + DB checks + creation + email)
async function handleUserCreation(data: any) {
  if (!data.email || !data.name) throw new Error('Invalid');
  const existing = await db.prepare('SELECT * FROM users WHERE email = ?')
    .bind(data.email).first();
  if (existing) throw new Error('User exists');
  const userId = generateId();
  await db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
    .bind(userId, data.email, data.name).run();
  await db.prepare('INSERT INTO user_points (id, user_id) VALUES (?, ?)')
    .bind(generateId(), userId).run();
  await sendWelcomeEmail(data.email);
  return userId;
}

// ✅ Good: Single responsibility with named helper functions
async function createUser(userData: CreateUserInput): Promise<string> {
  validateUserData(userData);
  await ensureUserDoesNotExist(userData.email);
  const userId = await insertUser(userData);
  await initializeUserProfile(userId);
  await sendWelcomeEmail(userData.email);
  return userId;
}
```

**Size Guidelines:**
- **Target**: Functions under 20-30 lines
- **Warning**: Functions over 50 lines likely need refactoring
- **Rule**: If you use "and" to describe what a function does, it's doing too much

**Complexity Indicators to Refactor:**
- **Deep nesting** (>3 levels) → Extract into named functions
- **Long parameter lists** (>3-4 params) → Use object parameters
- **Multiple early returns** → Simplify logic or use guard clauses intentionally
- **Complex conditionals** → Extract into well-named predicate functions

**Example - Extracting Complex Conditionals:**
```typescript
// ❌ Bad: Complex nested conditional
if (user && user.roles && user.roles.includes('admin') ||
    thread.author_id === user?.id && !thread.locked) {
  // Allow edit
}

// ✅ Good: Self-documenting extracted function
function canEditThread(thread: Thread, user: User | null): boolean {
  if (!user) return false;
  const isAdmin = user.roles?.includes('admin') ?? false;
  const isAuthor = thread.author_id === user.id;
  const isEditable = !thread.locked;
  return isAdmin || (isAuthor && isEditable);
}

if (canEditThread(thread, user)) {
  // Allow edit
}
```

### DRY (Don't Repeat Yourself)

**Code Duplication = Maintenance Burden** - If you copy-paste code, extract it:
```typescript
// ❌ Bad: Duplicated validation logic across endpoints
app.post('/api/v1/forum/threads', async (c) => {
  const body = await c.req.json();
  if (!body.title || body.title.length > 200) {
    return c.json({ error: 'Invalid title' }, 400);
  }
  if (!body.content || body.content.length < 10) {
    return c.json({ error: 'Content too short' }, 400);
  }
  // ...
});

app.put('/api/v1/forum/threads/:id', async (c) => {
  const body = await c.req.json();
  if (!body.title || body.title.length > 200) {
    return c.json({ error: 'Invalid title' }, 400);
  }
  if (!body.content || body.content.length < 10) {
    return c.json({ error: 'Content too short' }, 400);
  }
  // ...
});

// ✅ Good: Shared validation function
function validateThreadData(data: unknown): ValidationResult {
  if (!data.title || data.title.length > 200) {
    return { valid: false, error: 'Invalid title' };
  }
  if (!data.content || data.content.length < 10) {
    return { valid: false, error: 'Content too short' };
  }
  return { valid: true };
}

app.post('/api/v1/forum/threads', async (c) => {
  const body = await c.req.json();
  const validation = validateThreadData(body);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }
  // ...
});
```

**When to Extract:**
- Logic appears **3+ times** → Definitely extract
- Complex algorithm is repeated → Extract immediately
- Validation/transformation is duplicated → Create shared function

**When NOT to Extract:**
- Code appears only 1-2 times (avoid premature abstraction)
- Similar code has different intent/behavior
- Abstraction makes code harder to understand
- You're forcing unrelated code to share logic

### Comments and Self-Documenting Code

**Philosophy: Code should explain itself.** Good names > comments.

**Comments Explain WHY, Not WHAT:**
```typescript
// ✅ Good: Explains WHY (business logic, design decisions)

// Using bit flags instead of arrays for database efficiency (reduces storage by 80%)
const mentoringLevels = MentoringLevel.Entry | MentoringLevel.Senior;

// SQLite stores booleans as INTEGER (0/1), must convert to proper boolean
const isAvailable = Boolean(dbRow.available);

// Diminishing returns: prevent spam by reducing points for repeated actions
const pointMultiplier = Math.max(0.1, 1 - (actionCount * 0.1));

// Workaround: react-i18next doesn't support nested namespaces in production build
const translationKey = `forum.${category}.${key}`.replace(/\.\./g, '.');
```

**Bad Comments (States the Obvious):**
```typescript
// ❌ Bad: Code already says this

// Increment counter
counter++;

// Get user from database
const user = await db.prepare('SELECT * FROM users WHERE id = ?')
  .bind(id).first();

// Check if user exists
if (user) {
  // Return user data
  return user;
}

// Loop through threads
for (const thread of threads) {
  // Process thread
  processThread(thread);
}
```

**When Comments Are Needed:**
- Complex algorithms requiring mathematical/business explanation
- Non-obvious performance optimizations
- Workarounds for bugs in third-party dependencies
- Security considerations (e.g., "Must sanitize to prevent XSS")
- Database schema decisions (e.g., bit flags, normalization choices)

**Refactor Instead of Comment:**
```typescript
// ❌ Bad: Comment explains unclear code
// Check if user has permission to delete this thread
if (thread.author_id === user.id || user.roles.includes('admin') &&
    !thread.locked || moderators.has(user.id)) {
  // ...
}

// ✅ Good: Self-documenting extracted function
function canDeleteThread(thread: Thread, user: User): boolean {
  const isAuthor = thread.author_id === user.id;
  const isAdmin = user.roles.includes('admin');
  const isModerator = moderators.has(user.id);
  const isNotLocked = !thread.locked;

  return isAuthor || (isAdmin && isNotLocked) || isModerator;
}

if (canDeleteThread(thread, user)) {
  // ...
}
```

**TSDoc for Public APIs** - Use for exported functions/types:
```typescript
/**
 * Creates a new forum thread with automatic point award.
 *
 * @param userId - ID of the thread author
 * @param threadData - Thread title, content, and category
 * @returns The created thread with generated ID
 * @throws {ValidationError} If title or content is invalid
 * @throws {AuthorizationError} If user lacks permission
 */
export async function createThread(
  userId: string,
  threadData: CreateThreadInput
): Promise<Thread> {
  // Implementation
}
```

### Refactoring Guidelines

**When Touching Existing Code (Opportunistic Refactoring):**

1. **Fix obvious code smells** in the immediate area you're modifying
2. **Improve names** if they're unclear or misleading
3. **Extract complex logic** if you're already changing that function
4. **Don't refactor unrelated code** in the same commit

**Red Flags to Fix When You See Them:**
- **Magic numbers** → Extract to named constants
- **Unclear variable names** → Rename with descriptive names
- **Deeply nested conditionals** → Extract into functions
- **Copy-pasted code** → Apply DRY extraction
- **Functions doing multiple things** → Split responsibilities

**What NOT to Refactor:**
- Code that works and is reasonably clear
- Patterns consistent with the rest of the codebase
- Code completely unrelated to your current change
- "Perfect is the enemy of good" - don't over-optimize

**Example - Opportunistic Refactoring:**
```typescript
// You're adding a new field to this function
async function updateThread(threadId: string, title: string, content: string) {
  // Opportunistic fixes while here:
  // 1. Extract magic number
  const MAX_TITLE_LENGTH = 200;

  // 2. Improve validation logic clarity
  if (!isValidTitle(title, MAX_TITLE_LENGTH)) {
    throw new Error('Invalid title');
  }

  // 3. Your new feature
  const updatedAt = Date.now();

  await db.prepare('UPDATE threads SET title = ?, content = ?, updated_at = ? WHERE id = ?')
    .bind(title, content, updatedAt, threadId)
    .run();
}
```

## Debugging & Support

### Common Commands

```bash
npm run build              # Type-check all three TypeScript projects
npm run db:schema          # View local database schema
npm run test               # Run full test suite
npm run test:coverage      # Check if coverage thresholds pass
npx wrangler tail          # Stream production logs
```

### Documentation

- **Points System**: docs/POINTS_SYSTEM.md
- **RBAC**: docs/RBAC.md
- **i18n**: docs/I18N.md
- **Hooks**: docs/HOOKS.md

### Key Dependencies

- **Hono**: Web framework for Cloudflare Worker backend
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **@cloudflare/vite-plugin**: Cloudflare Workers integration
- **Wrangler**: Cloudflare's CLI for Workers deployment
- **jose**: JWT token creation and verification
- **react-i18next**: Internationalization framework
- **Vitest**: Test framework with jsdom and node environments

## Project-Specific Notes

### Claude Code Hooks

Automated quality checks run during Claude Code sessions. See docs/HOOKS.md for details on:
- Automatic linting, building, and testing
- Hook configuration and performance
- Troubleshooting hook failures

### TDD Reminder

**ALWAYS write tests before implementing features or fixing bugs.** The Red-Green-Refactor cycle is mandatory. Coverage thresholds are enforced - builds will fail if coverage drops below required levels.
