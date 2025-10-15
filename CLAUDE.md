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

When adding database functionality:

1. **Add D1 binding** to `wrangler.json`:
   ```json
   {
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "platform-db",
         "database_id": "your-database-id"
       }
     ]
   }
   ```

2. **Regenerate types**: `npm run cf-typegen` to update `worker-configuration.d.ts`

3. **Create migrations** in `migrations/` directory following SQLite syntax

4. **Access in Worker code**:
   ```typescript
   app.get('/api/v1/users', async (c) => {
     const db = c.env.DB;
     const result = await db.prepare('SELECT * FROM users').all();
     return c.json(result.results);
   });
   ```

5. **Test with mocks** - Mock the D1 database in tests:
   ```typescript
   const mockDb = {
     prepare: vi.fn(() => ({
       all: vi.fn(() => ({ results: [] }))
     }))
   };
   ```

**Important:** D1 uses SQLite syntax. Refer to [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/) for query syntax and limitations.

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
