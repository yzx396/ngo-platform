# Lead Forward Platform - System Architecture

## Overview

Lead Forward Platform is being transformed from a mentor-mentee matching platform into a comprehensive NGO community platform using **vertical slicing** - an approach where each feature is developed end-to-end (database → backend → frontend → tests) and can be independently deployed.

This document describes the system architecture, design patterns, and implementation approach for the platform.

---

## Table of Contents

1. [Vertical Slicing Approach](#vertical-slicing-approach)
2. [System Architecture](#system-architecture)
3. [Phase 0: Foundation](#phase-0-foundation)
4. [Database Schema](#database-schema)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Deployment Model](#deployment-model)
8. [Development Workflow](#development-workflow)
9. [Future Phases](#future-phases)

---

## Vertical Slicing Approach

### What is Vertical Slicing?

Vertical slicing is a development methodology where each feature is implemented **end-to-end** across all layers:
- **Database**: Schema and migrations
- **Backend**: API endpoints and business logic
- **Frontend**: UI components and user interactions
- **Tests**: Comprehensive test coverage

### Benefits

1. **Early Value Delivery**: Each slice provides real, working functionality that can be deployed immediately
2. **Reduced Integration Risk**: Features are validated end-to-end before next slice begins
3. **Fast Feedback**: Users/stakeholders can test and provide feedback on working features
4. **Flexible Prioritization**: Slices can be reordered or skipped based on priorities
5. **Team Autonomy**: Different teams can work on different slices in parallel

### Transformation Plan

The platform transformation is organized into phases, each containing multiple slices:

```
Phase 0: Foundation & Platform Restructure
├── Slice 0.1: User Roles System ✅
├── Slice 0.2: Points System ✅
├── Slice 0.3: New Navigation Layout ✅
└── Slice 0.4: Documentation Update ✅

Phase 1: Feed & Posts System (Coming)
├── Slice 1.1: View Posts Feed
├── Slice 1.2: Create Posts
├── Slice 1.3: Like Posts
├── Slice 1.4: Comment on Posts
└── Slice 1.5: Post Types & Admin Announcements

Phase 2: Challenges System (Coming)
├── Slice 2.1: View Challenges
├── Slice 2.2: Admin Create & Manage Challenges
├── Slice 2.3: Submit to Challenges
└── Slice 2.4: Review Submissions & Award Points

Phase 3: Blogs System (Coming)
... and more
```

See [docs/NGO_PLATFORM_TRANSFORMATION.md](./NGO_PLATFORM_TRANSFORMATION.md) for the complete transformation plan.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐          ┌─────────────────────────┐ │
│  │ React SPA    │ ◄──────► │  Hono Backend API       │ │
│  │ (Frontend)   │  HTTP    │  (Worker Routes)        │ │
│  │              │          │                         │ │
│  │ - Sidebar    │          │ - Auth (OAuth + JWT)    │ │
│  │ - Layout     │          │ - Roles & Permissions   │ │
│  │ - Pages      │          │ - Points System         │ │
│  │ - Components │          │ - Future: Posts, Blogs  │ │
│  └──────────────┘          └────────────┬────────────┘ │
│                                          │              │
│                                          ▼              │
│                            ┌──────────────────────────┐ │
│                            │  Cloudflare D1 (SQLite)  │ │
│                            │  (Serverless Database)   │ │
│                            │                          │ │
│                            │ - users                  │ │
│                            │ - user_roles             │ │
│                            │ - user_points            │ │
│                            │ - mentor_profiles        │ │
│                            │ - matches                │ │
│                            │ - (future: posts, blogs) │ │
│                            └──────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Edge-Deployed Full Stack**: Both frontend and backend deployed to Cloudflare Workers
   - **Benefit**: Global distribution, low latency, simple deployment
   - **Trade-off**: Serverless limitations on execution time and storage

2. **Stateless Architecture**: JWT-based authentication, no server-side sessions
   - **Benefit**: Scales horizontally, no session management complexity
   - **Trade-off**: Token expiration management, logout doesn't invalidate tokens immediately

3. **Monolithic Codebase**: Frontend and backend in same repository
   - **Benefit**: Easier type sharing, simpler dependency management
   - **Trade-off**: Not independently scalable, requires coordination for deployments

4. **TypeScript Everywhere**: Type safety across full stack
   - **Benefit**: Catch errors at compile time, better IDE support
   - **Trade-off**: Build step required, slight increase in bundle size

---

## Phase 0: Foundation

Phase 0 establishes the foundation for the new community platform through four slices.

### Slice 0.1: User Roles System ✅

**Goal**: Enable role-based access control and permissions management

**What Was Delivered**:
- Database migration creating `user_roles` table
- Role types and helper functions (`src/types/role.ts`)
- Backend API for role assignment (`POST /api/v1/roles`)
- Frontend badge component (`UserRoleBadge`)
- Role-based middleware for admin-only routes (`requireAdmin`)

**Key Design**:
- Two-tier system: Admin and Member (default)
- One role per user (UNIQUE constraint)
- Roles stored with audit timestamp

**API Endpoints**:
```
POST /api/v1/roles           # Assign role (admin only)
GET  /api/v1/users/:id/role  # Get user's role
```

### Slice 0.2: Points System ✅

**Goal**: Implement gamification through a points and leaderboard system

**What Was Delivered**:
- Database migration creating `user_points` table
- Points types and formatting helpers (`src/types/points.ts`)
- Backend APIs for points management
- Frontend badge component (`UserPointsBadge`)
- Auto-initialization of points on first access
- On-the-fly rank calculation using SQL window functions

**Key Design**:
- No stored rank column (calculated with `ROW_NUMBER() OVER (ORDER BY points DESC)`)
- Auto-initialization: First access creates zero-point record
- Color-coded display based on points amount
- Consistent Unix timestamps for time tracking

**API Endpoints**:
```
GET  /api/v1/users/:id/points      # Get user points with rank
PATCH /api/v1/users/:id/points     # Update points (admin only)
```

**Points Rules** (as implemented):
- Challenge completion: Variable (configured per challenge)
- Blog post: +10 points
- Featured blog: +50 bonus points
- Mentorship completion: +20 points (both parties)
- Leaderboard: Visible via `GET /api/v1/leaderboard` (future)

### Slice 0.3: New Navigation Layout ✅

**Goal**: Create modern community-focused navigation replacing mentor-centric home

**What Was Delivered**:
- Sidebar component (`src/react-app/components/Sidebar.tsx`)
- Layout wrapper (`src/react-app/components/Layout.tsx`)
- Three navigation sections:
  1. **Feed** (public) - Posts, Challenges, Blogs
  2. **Member Area** (authenticated) - Profile, Mentorships, My Challenges, My Blogs
  3. **Links** (public) - Leaderboard, Browse Mentors
- Integration with App.tsx
- Responsive design (sidebar hidden on mobile)

**Key Design**:
- Fixed width sidebar (256px) on desktop
- Conditional rendering based on authentication
- Active route highlighting
- Accessible navigation with ARIA labels
- i18n translations for all labels

### Slice 0.4: Documentation Update ✅

**Goal**: Update all documentation to reflect Phase 0 changes

**What Was Delivered**:
- Updated CLAUDE.md with role system and navigation layout documentation
- Updated README.md with new platform description and features
- Created docs/ARCHITECTURE.md (this file)
- Updated NGO_PLATFORM_TRANSFORMATION.md to mark phases as complete

---

## Database Schema

### Core Tables (Phase 0)

#### users
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE
name TEXT
google_id TEXT
created_at INTEGER
updated_at INTEGER
```

**Purpose**: Core user records created via Google OAuth

#### user_roles
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
role TEXT (admin|member) -- CHECK constraint
created_at INTEGER
```

**Purpose**: Store user roles for RBAC
**Design Notes**:
- One role per user (UNIQUE on user_id)
- Default: member
- Audit timestamp for tracking changes

#### user_points
```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY)
points INTEGER DEFAULT 0
updated_at INTEGER
```

**Purpose**: Track user points and enable leaderboard
**Design Notes**:
- No stored rank (calculated on-the-fly)
- Auto-initialized on first access
- Updated when points are awarded

#### mentor_profiles
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

**Purpose**: Mentor-specific profile data
**Design Notes**:
- One profile per mentor
- Uses bit flags for efficient storage of multiple selections
- JSON for complex data (availability patterns, topics)

#### matches
```sql
id TEXT PRIMARY KEY
mentee_id TEXT (FOREIGN KEY)
mentor_id TEXT (FOREIGN KEY)
status TEXT (pending|accepted|active|completed)
requested_at INTEGER
responded_at INTEGER
completed_at INTEGER
notes TEXT
```

**Purpose**: Track mentorship relationships
**Design Notes**:
- Mentee-initiated matching (mentees send requests)
- Status progression: pending → accepted → active → completed
- Timestamps for lifecycle tracking

### Future Tables (Planned)

Phase 1-4 will introduce:
- `posts` - Community feed posts
- `post_likes`, `post_comments` - Engagement
- `challenges` - Challenge definitions
- `challenge_submissions` - User submissions and approvals
- `blogs` - Member-created blog posts
- And more...

---

## Frontend Architecture

### Component Structure

```
src/react-app/
├── components/
│   ├── Layout.tsx                  # Main layout wrapper
│   ├── Sidebar.tsx                 # Navigation sidebar
│   ├── Navbar.tsx                  # Top navigation bar
│   ├── ProtectedRoute.tsx           # Auth route wrapper
│   ├── UserRoleBadge.tsx            # Role display
│   ├── UserPointsBadge.tsx          # Points display
│   ├── MentorCard.tsx               # Mentor profile card
│   ├── ErrorBoundary.tsx            # Error handling
│   ├── LanguageSwitcher.tsx         # Language toggle
│   └── ui/                          # shadcn/ui components
├── pages/
│   ├── LoginPage.tsx                # Google OAuth login
│   ├── OAuthCallbackPage.tsx        # OAuth callback handler
│   ├── HomePage.tsx                 # Community home
│   ├── MentorBrowse.tsx             # Mentor search/browse
│   ├── MentorProfileSetup.tsx       # Mentor profile creation
│   └── MatchesList.tsx              # User's mentorships
├── services/
│   ├── apiClient.ts                 # Base HTTP client
│   ├── authService.ts               # Auth endpoints
│   ├── mentorService.ts             # Mentor endpoints
│   ├── matchService.ts              # Match endpoints
│   ├── pointsService.ts             # Points endpoints
│   └── roleService.ts               # Role endpoints
├── context/
│   └── AuthContext.tsx              # Auth state management
├── i18n/
│   ├── index.ts                     # i18n setup
│   └── locales/
│       ├── zh-CN/translation.json   # Chinese
│       └── en/translation.json      # English
├── App.tsx                          # Main app with routing
├── main.tsx                         # React entry point
└── __tests__/                       # Component tests
```

### Layout & Routing

**App.tsx** routing structure:
```
/login                              # Login page (no layout)
/auth/google/callback               # OAuth callback (no layout)
/                                   # Home (with layout + sidebar)
/mentors/browse                     # Browse mentors (with layout)
/mentors/:id                        # Mentor detail (with layout)
/mentor/profile/setup               # Setup profile (protected, with layout)
/matches                            # My mentorships (protected, with layout)
```

**Layout Integration**:
- Auth pages bypass `Layout` component
- All other pages rendered inside `Layout` (sidebar + main content)
- Responsive: Sidebar hidden on mobile

### State Management

**AuthContext** (`src/react-app/context/AuthContext.tsx`):
- Manages: `user`, `token`, `isAuthenticated`, `loading`
- Provides: `useAuth()` hook for components
- Persists: Token in localStorage
- Auto-refreshes: User on mount

**Other State**:
- Component state for forms and temporary UI state
- No global state management library (Context sufficient)

### Internationalization (i18n)

**Framework**: react-i18next
**Default**: Simplified Chinese (zh-CN)
**Fallback**: English (en)

**Key Namespaces**:
```json
{
  "common": "Button labels, UI elements",
  "navigation": "Sidebar and navbar labels",
  "roles": "Role names",
  "points": "Points system text",
  "mentor": "Mentor-related strings",
  "auth": "Authentication strings",
  "errors": "Error messages"
}
```

---

## Backend Architecture

### Hono Framework Structure

**Entry Point**: `src/worker/index.ts`

Routes organized by domain:
```typescript
// Authentication
app.get('/api/v1/auth/google/login', ...)
app.get('/api/v1/auth/google/callback', ...)
app.get('/api/v1/auth/me', ...)

// User Management & Roles
app.get('/api/v1/users/:id', ...)
app.get('/api/v1/users/:id/role', ...)
app.post('/api/v1/roles', requireAuth, requireAdmin, ...)

// Points System
app.get('/api/v1/users/:id/points', ...)
app.patch('/api/v1/users/:id/points', requireAuth, requireAdmin, ...)

// Mentor Endpoints
app.get('/api/v1/mentors/search', ...)
app.get('/api/v1/mentors/profiles/:id', ...)
app.post('/api/v1/mentors/profiles', requireAuth, ...)

// Match Endpoints
app.get('/api/v1/matches', requireAuth, ...)
app.post('/api/v1/matches', requireAuth, ...)

// Future endpoints will follow same pattern
```

### Middleware & Authentication

**Authentication Middleware** (`src/worker/auth/middleware.ts`):
```typescript
// Extract and verify JWT from Authorization header
export const requireAuth = async (c, next) => {
  // Validate token
  // Extract user info
  // Attach to context
};

// Check if user is admin
export const requireAdmin = async (c, next) => {
  // Require auth
  // Verify admin role
};
```

**Pattern**:
```typescript
app.post("/api/v1/admin-only", requireAuth, requireAdmin, handler)
```

### JWT Token Format

```typescript
{
  userId: string;
  email: string;
  name: string;
  role?: string;        // Added in Phase 0
  points?: number;      // Added in Phase 0
  iat: number;          // Issued at
  exp: number;          // Expires in 7 days
}
```

### Error Handling

**Response Format**:
```typescript
// Success
200 OK
{ data: ... }

// Validation Error
400 Bad Request
{ error: { code: "INVALID_INPUT", message: "..." } }

// Authentication Error
401 Unauthorized
{ error: { code: "UNAUTHORIZED", message: "..." } }

// Permission Error
403 Forbidden
{ error: { code: "FORBIDDEN", message: "..." } }

// Not Found
404 Not Found
{ error: { code: "NOT_FOUND", message: "..." } }

// Server Error
500 Internal Server Error
{ error: { code: "INTERNAL_ERROR", message: "..." } }
```

### Database Access

**D1 Integration**:
```typescript
const db = c.env.platform_db;  // Injected by Cloudflare

// Query
const result = await db.prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId)
  .first();

// Insert/Update
const result = await db.prepare("INSERT INTO user_points ...")
  .bind(...)
  .run();
```

---

## Deployment Model

### Development

**Local Development**:
```bash
npm run dev  # Starts Vite + Worker with HMR
```

- Frontend: Hot reload on file changes
- Backend: Hot reload on Worker file changes
- Local D1: Database at `.wrangler/state/d1/`

### Production Deployment

**Deployment Process**:
1. Build: `npm run build` → Compiles TypeScript, bundles React
2. Deploy: `npm run deploy` → Publishes to Cloudflare Workers

**What Gets Deployed**:
- Worker code: `dist/worker/`
- Static assets: `dist/client/` (served by Worker)
- Configuration: `wrangler.json`

**Scaling**:
- Workers: Automatically scaled by Cloudflare (global distribution)
- Database: D1 automatically backed up, replicated

### Environment Variables

**Local** (`.dev.vars`):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=dev-secret
```

**Production** (via `wrangler secret put`):
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_SECRET
```

---

## Development Workflow

### Getting Started

1. **Clone & Setup**:
   ```bash
   git clone ...
   npm install
   ```

2. **Configure OAuth**:
   - Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
   - Create `.dev.vars` with credentials

3. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start Development**:
   ```bash
   npm run dev
   npm run test:watch  # In separate terminal
   ```

### Test-Driven Development (TDD)

**Workflow**:
1. Write failing test (Red)
2. Implement feature (Green)
3. Refactor (maintain green)
4. Commit with passing tests

**Commands**:
```bash
npm run test:watch                      # Watch mode (best for TDD)
npm run test                            # Single run
npm run test:coverage                   # Coverage report
npm run test:watch -- --project=react   # React tests only
npm run test:watch -- --project=worker  # Backend tests only
```

### Creating a New Feature

1. **Plan the Slice**
   - Define database schema changes (migrations)
   - Define API endpoints
   - Define frontend components and pages
   - Write tests first (TDD)

2. **Implement Backend**
   - Create migration if needed: `migrations/000N_description.sql`
   - Add types: `src/types/new-feature.ts`
   - Add API routes: `src/worker/index.ts`
   - Write tests: `src/worker/__tests__/feature.test.ts`
   - Test: `npm run test:watch -- --project=worker`

3. **Implement Frontend**
   - Create components: `src/react-app/components/`
   - Create pages if needed: `src/react-app/pages/`
   - Create service: `src/react-app/services/`
   - Write tests: `src/react-app/__tests__/`
   - Test: `npm run test:watch -- --project=react`

4. **Add Translations**
   - Update `src/react-app/i18n/locales/zh-CN/translation.json`
   - Update `src/react-app/i18n/locales/en/translation.json`

5. **Verify & Commit**
   ```bash
   npm run test              # All tests pass
   npm run lint              # Code style
   npm run build             # TypeScript compilation
   git commit -m "feat: implement new feature"
   ```

6. **Deploy**
   ```bash
   npm run deploy
   ```

---

## Future Phases

### Phase 1: Feed & Posts System

Community posts with likes and comments:
- Slice 1.1: View Posts Feed
- Slice 1.2: Create Posts
- Slice 1.3: Like Posts
- Slice 1.4: Comment on Posts
- Slice 1.5: Post Types & Admin Announcements

### Phase 2: Challenges System

Admin-curated challenges with point rewards:
- Slice 2.1: View Challenges
- Slice 2.2: Admin Create & Manage Challenges
- Slice 2.3: Submit to Challenges
- Slice 2.4: Review Submissions & Award Points

### Phase 3: Blogs System

Member blog posts with engagement:
- Slice 3.1: Read & Browse Blogs
- Slice 3.2: Write & Publish Blogs
- Slice 3.3: Blog Engagement (Likes & Comments)
- Slice 3.4: Featured Blogs & Admin Curation

### Phase 4: Leaderboard & Gamification

Points visualization and rankings:
- Slice 4.1: Basic Leaderboard
- Slice 4.2: Time-Period Filters
- Slice 4.3: Points Display & User Badges
- Slice 4.4: Points System Documentation

### Phase 5: Mentorship Redesign

Integrate mentorship into community platform:
- Slice 5.1: Database & API Restructure
- Slice 5.2: Move to Member Area
- Slice 5.3: Simplify Mentor Profiles
- Slice 5.4: Award Points for Mentorships

### Phase 6: Final Integration & Polish

Admin tools, performance, security:
- Slice 6.1: Admin Dashboard
- Slice 6.2: User Activity Feed
- Slice 6.3: Performance Optimization
- Slice 6.4: Documentation
- Slice 6.5: Security & Quality Assurance
- Slice 6.6: Phased Deployment

See [docs/NGO_PLATFORM_TRANSFORMATION.md](./NGO_PLATFORM_TRANSFORMATION.md) for complete transformation plan with detailed tasks.

---

## Key Architectural Principles

1. **Vertical Slices**: Each feature end-to-end (DB → API → UI → Tests)
2. **Early Deployment**: Deploy frequently, get feedback early
3. **Type Safety**: Shared types between frontend and backend
4. **Test Coverage**: >80% for critical paths, 100% for business logic
5. **Accessibility**: WCAG 2.1 compliant, semantic HTML, ARIA labels
6. **Internationalization**: All UI text translatable from day one
7. **Responsive Design**: Mobile-first approach, works on all devices
8. **Edge-Optimized**: Designed for Cloudflare's edge computing model

---

## Glossary

| Term | Definition |
|------|-----------|
| **Vertical Slice** | A complete end-to-end feature spanning all layers (DB, API, UI, Tests) |
| **Edge Computing** | Code execution at geographic edge locations for low latency |
| **Stateless** | No server-side session storage; state managed via JWT tokens |
| **Middleware** | Functions that intercept requests (e.g., authentication checks) |
| **Bit Flags** | Integer representing multiple boolean flags (efficient storage) |
| **RBAC** | Role-Based Access Control; permission system based on user roles |
| **JWT** | JSON Web Token; stateless authentication token format |
| **D1** | Cloudflare's serverless SQLite database service |
| **TDD** | Test-Driven Development; write tests before implementation |

---

**Last Updated**: October 31, 2025
**Phase 0 Status**: ✅ Complete
**Next Phase**: Phase 1 - Feed & Posts System
