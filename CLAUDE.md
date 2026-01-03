# CLAUDE.md

## CRITICAL RULES

1. **TDD is mandatory** - Write failing tests FIRST, then implement. No exceptions.
2. **No over-engineering** - Only implement what's requested. No extra features, no "improvements".
3. **Clean code always** - Descriptive names, single responsibility, no magic numbers.
4. **Run `npm run quality-check` before committing** - Must pass lint, tests, and build.

## Project Overview

**Lead Forward Platform** - NGO community website with mentor matching, forums, challenges, blogs.

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite |
| Backend | Hono (Cloudflare Worker) |
| Database | Cloudflare D1 (SQLite) |
| Auth | Google OAuth 2.0 + JWT |

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run test             # Run tests
npm run quality-check    # Lint + test + build
npm run db:migrate       # Apply migrations
npm run db:schema        # View schema
```

## TDD Requirements

**Mandatory for all features and bug fixes.** Cycle: Red → Green → Refactor

Coverage thresholds (builds fail if not met):
- React: 85% statements/functions/lines, 80% branches
- Worker: 100% all metrics

```bash
# Test locations
src/react-app/__tests__/    # React tests (jsdom)
src/worker/__tests__/       # API tests (node)
```

## Architecture

```
src/react-app/    # Frontend (tsconfig.app.json)
src/worker/       # Backend API (tsconfig.worker.json)
src/types/        # Shared types
```

**Rules:**
- API endpoints: Always `/api/v1/` prefix
- API calls: Always through service layer (`src/react-app/services/`)
- SQLite booleans: Always convert with `Boolean(dbRow.field)`

## Features

| Feature | Tables | API |
|---------|--------|-----|
| Auth | users, user_roles | /api/v1/auth/* |
| Mentors | mentor_profiles, matches | /api/v1/mentors/* |
| Forum | forum_* | /api/v1/forum/* |
| Challenges | challenges, challenge_* | /api/v1/challenges/* |
| Blogs | blogs, blog_* | /api/v1/blogs/* |
| Points | user_points, point_actions_log | /api/v1/points/* |

**Mentor bit flags:** See `src/types/mentor.ts` for `MentoringLevel`, `PaymentType` enums.

## Database

```bash
npm run db:migrate           # Local
npm run db:migrate:prod      # Production (caution!)
rm -rf .wrangler/state/d1/ && npm run db:migrate  # Reset local
```

Migrations: `migrations/` directory, numbered `0001_*.sql`. Never edit applied migrations.

## Code Standards

**Naming:**
- Booleans: `is*`, `has*`, `can*`, `should*`
- Functions: verbs (`createUser`, `validateEmail`)
- Constants: `UPPER_SNAKE_CASE`

**Functions:**
- Single responsibility, <30 lines target
- Extract if >3 levels nesting or >4 parameters
- Extract if logic repeated 3+ times

**Comments:** Explain WHY, not WHAT. Prefer self-documenting code.

**Avoid:**
- Over-engineering beyond scope
- Adding features/refactoring not requested
- Error handling for impossible scenarios
- Backwards-compat hacks (just delete unused code)

## Testing Patterns

**React components:** Mock context hooks, not providers
```typescript
vi.mock('../context/AuthContext', async () => ({
  ...await vi.importActual('../context/AuthContext'),
  useAuth: vi.fn(),
}));
```

**API routes:** Mock database with `vi.fn()`
```typescript
const mockDb = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ all: vi.fn() }) }) };
```

**Async tests:** Always `await waitFor()` for state updates to avoid act() warnings.

## Docs

- Points: `docs/POINTS_SYSTEM.md`
- RBAC: `docs/RBAC.md`
- i18n: `docs/I18N.md`
