# Lead Forward Platform

**An NGO community platform connecting mentors and mentees**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-org/lead-forward-platform)

Lead Forward Platform is a comprehensive NGO community platform that connects members through mentorship, challenges, and shared learning. Beyond mentor-mentee matching, the platform features a modern community feed, gamified points system, admin-curated challenges, and member-created blogs. Built on Cloudflare's edge network, it provides fast, reliable performance for global NGO communities.

![Tech Stack](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fc7b4b62-442b-4769-641b-ad4422d74300/public)

---

## ✨ Features

### Community Features
- **📰 Community Feed** - Shared posts and updates from community members
- **🎯 Challenges** - Member challenges with points rewards (admin-curated)
- **📝 Blogs** - Members can publish and share blog posts with the community
- **🏆 Leaderboard** - Gamified points system showing top community contributors
- **💬 Engagement** - Like, comment, and interact with community content

### Mentorship Features
- **🔐 Google OAuth Authentication** - Secure, password-free sign-in
- **👤 Mentor Profiles** - Create rich profiles with expertise, availability, and rates
- **🔍 Public Mentor Browsing** - Search and discover mentors by level, payment type, and availability
- **🤝 User-Driven Matching** - Mentees initiate match requests; mentors accept or decline
- **📊 Match Management** - Track match lifecycle: pending → accepted → active → completed
- **💳 Flexible Payments** - Support for Venmo, PayPal, Zelle, Alipay, WeChat Pay, and Crypto

### Platform Features
- **👥 Role-Based Access Control** - Admin and Member roles for permission management
- **⭐ Points & Gamification** - Earn points for activities, visible on leaderboard
- **🎨 Modern Navigation** - Intuitive sidebar with Feed, Member Area, and Links sections
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **🌍 Internationalization** - Support for Simplified Chinese (default) and English
- **♿ Accessibility** - WCAG 2.1 compliant with semantic HTML and ARIA labels

---

## 🚀 Tech Stack

### Frontend
- **[React 19](https://react.dev/)** - Modern UI library with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[shadcn/ui](https://ui.shadcn.com/)** + **[Radix UI](https://www.radix-ui.com/)** - Accessible component library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[React Router](https://reactrouter.com/)** - Client-side routing

### Backend
- **[Hono](https://hono.dev/)** - Lightweight, fast web framework
- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** - Edge compute platform
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Serverless SQLite database

### Build & Development
- **[Vite](https://vite.dev/)** - Lightning-fast build tooling with HMR
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** - Cloudflare deployment CLI

---

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare Account** (free tier works)
- **Google Cloud Console Project** (for OAuth - see setup guide below)

---

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth

Follow the step-by-step guide in **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** to:
1. Create a Google Cloud Console project
2. Configure OAuth credentials
3. Set up redirect URIs for local and production environments

Then create a `.dev.vars` file in the project root:

```bash
# .dev.vars (for local development)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-local-dev-secret
```

⚠️ **Never commit `.dev.vars` to version control** (already in `.gitignore`)

### 3. Set Up Database

Run migrations to create the database schema:

```bash
# Create local D1 database and run migrations
npm run db:migrate
```

Verify the schema was created:

```bash
npm run db:schema
```

### 4. Start Development Server

```bash
npm run dev
```

Your application will be available at **[http://localhost:5173](http://localhost:5173)**

---

## 📦 Development Commands

### Core Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (TypeScript compilation + Vite bundle)
npm run build

# Preview production build locally
npm run preview

# Type-check and verify build (includes dry-run deploy)
npm run check

# Lint codebase
npm run lint
```

### Testing Commands

This project follows **Test-Driven Development (TDD)**. Always write tests before implementing features.

```bash
# Run all tests once
npm run test

# Run tests in watch mode (auto-rerun on changes) - best for TDD
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui

# Run specific test file
npm run test:watch -- src/react-app/__tests__/App.test.tsx

# Run only React tests
npm run test:watch -- --project=react

# Run only Worker/API tests
npm run test:watch -- --project=worker
```

### Database Commands

```bash
# Run migrations on local D1 database
npm run db:migrate

# View local database schema
npm run db:schema

# Run migrations on production D1 database
npm run db:migrate:prod

# View production database schema
npm run db:schema:prod
```

### Deployment Commands

```bash
# Build and deploy to Cloudflare Workers
npm run build && npm run deploy

# Deploy to production
npm run deploy

# Monitor worker logs
npx wrangler tail

# Regenerate Cloudflare types after wrangler.json changes
npm run cf-typegen
```

---

## 📂 Project Structure

```
ngo-platform/
├── src/
│   ├── react-app/           # Frontend React application
│   │   ├── components/      # UI components
│   │   │   ├── Layout.tsx            # Two-column layout wrapper
│   │   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   │   ├── Navbar.tsx            # Top navigation bar
│   │   │   ├── UserRoleBadge.tsx     # User role display
│   │   │   ├── UserPointsBadge.tsx   # User points display
│   │   │   ├── MentorCard.tsx        # Mentor profile card
│   │   │   ├── ProtectedRoute.tsx    # Auth route wrapper
│   │   │   └── ...other components/
│   │   ├── context/         # React context (AuthContext)
│   │   ├── pages/           # Route pages (Login, HomePage, MentorBrowse, etc.)
│   │   ├── services/        # API client and service layer (mentorService, pointsService, etc.)
│   │   ├── i18n/            # Internationalization (Chinese and English)
│   │   └── __tests__/       # React component tests
│   ├── worker/              # Backend Hono API (Cloudflare Worker)
│   │   ├── auth/            # Authentication (JWT, Google OAuth, middleware)
│   │   ├── index.ts         # Main API routes (roles, points, mentors, matches, etc.)
│   │   └── __tests__/       # API route tests
│   └── types/               # Shared TypeScript types
│       ├── user.ts          # User types
│       ├── role.ts          # Role system types
│       ├── points.ts        # Points system types
│       ├── mentor.ts        # Mentor profile types
│       ├── match.ts         # Match/mentorship types
│       └── api.ts           # API request/response types
├── migrations/              # D1 database migrations (SQLite)
│   ├── 0001-0006/          # Original mentor-mentee migrations
│   ├── 0007_create_user_roles_table.sql        # Role system
│   └── 0008_create_user_points_table.sql       # Points system
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System architecture and design
│   ├── NGO_PLATFORM_TRANSFORMATION.md # Vertical slice transformation plan
│   └── ...other docs/
├── dist/                    # Build output (generated)
│   ├── client/              # Frontend bundle (served as static assets)
│   └── worker/              # Worker bundle
├── wrangler.json            # Cloudflare Workers configuration
├── vite.config.ts           # Vite build configuration
├── vitest.config.ts         # Vitest test configuration
├── CLAUDE.md                # Detailed developer documentation
└── README.md                # This file
```

---

## 🏗️ Architecture Overview

### Hybrid Full-Stack Architecture

The platform uses a **unified deployment model** where both the React frontend and Hono backend are deployed together to Cloudflare Workers:

- **Frontend**: React app built with Vite, served as static assets from `dist/client/`
- **Backend**: Hono framework handles API routes at `/api/v1/*`
- **Database**: Cloudflare D1 (serverless SQLite) for persistent data
- **Authentication**: Google OAuth 2.0 + JWT tokens (stateless, edge-friendly)

### API Design

All API endpoints follow versioned RESTful conventions:

```
/api/v1/auth/*              # Authentication (login, callback, logout)
/api/v1/users               # User management
/api/v1/users/:id/points    # Points system
/api/v1/users/:id/role      # Role management
/api/v1/roles               # Role assignment (admin only)
/api/v1/mentors/profiles/*  # Mentor profile CRUD
/api/v1/mentors/search      # Public mentor search
/api/v1/matches/*           # Match requests and lifecycle
/api/v1/posts/*             # Feed posts (coming soon)
/api/v1/challenges/*        # Challenges system (coming soon)
/api/v1/blogs/*             # Blog management (coming soon)
/api/v1/leaderboard         # Leaderboard rankings (coming soon)
```

**Type Safety**: Shared TypeScript types (`src/types/`) ensure consistency between frontend and backend.

For detailed architecture documentation, database schema, development patterns, and the transformation plan, see **[CLAUDE.md](./CLAUDE.md)** and **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

---

## 🧪 Testing Philosophy

This project follows **Test-Driven Development (TDD)** using the **Red-Green-Refactor** cycle:

1. **Red** - Write a failing test first
2. **Green** - Write minimal code to make the test pass
3. **Refactor** - Improve code while keeping tests green

### When to Write Tests

**Always write tests when:**
- Adding a new feature (write test first, then implement)
- Fixing a bug (write test that reproduces bug, then fix)
- Refactoring existing code (ensure tests exist and pass before/after)

**Tests are not optional** - they are part of the definition of "done."

### Test Organization

Tests are colocated with source files in `__tests__/` directories:

```
src/react-app/__tests__/    # React component tests (jsdom environment)
src/worker/__tests__/        # API route tests (node environment)
```

Run tests in watch mode during development for instant feedback:

```bash
npm run test:watch
```

---

## 🚀 Deployment

### 1. Set Up Production Secrets

Store sensitive environment variables as Cloudflare secrets (not in `wrangler.json`):

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

### 2. Create Production Database

If not already created, set up your production D1 database:

```bash
# Create database (if needed)
wrangler d1 create platform-db

# Update database_id in wrangler.json with the returned ID
```

### 3. Run Production Migrations

```bash
npm run db:migrate:prod
```

### 4. Build and Deploy

```bash
npm run build
npm run deploy
```

Your application will be deployed to Cloudflare's global edge network!

### 5. Monitor Logs

```bash
npx wrangler tail
```

---

## 🤝 Contributing

### Development Workflow

1. **Write tests first** (TDD approach)
2. **Run tests in watch mode** during development
3. **Ensure all tests pass** before committing
4. **Run linter** to catch style issues

```bash
npm run test:watch    # Keep running during development
npm run test          # Final check before commit
npm run lint          # Fix linting issues
npm run build         # Verify build succeeds
```

### Code Quality Standards

- **TypeScript strict mode** - No implicit `any`, unused variables, or fallthrough cases
- **Test coverage** - Aim for >80% coverage on critical paths
- **API versioning** - All API routes must use `/api/v1/` prefix
- **Type safety** - Use shared types from `src/types/` for API contracts

For detailed development guidelines, project-specific patterns (like bit flags), and architecture decisions, see **[CLAUDE.md](./CLAUDE.md)**.

---

## 📚 Additional Resources

- **[Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)**
- **[Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)**
- **[Hono Documentation](https://hono.dev/)**
- **[Vite Documentation](https://vitejs.dev/guide/)**
- **[React Documentation](https://react.dev/)**
- **[Vitest Documentation](https://vitest.dev/)**
- **[shadcn/ui Documentation](https://ui.shadcn.com/)**

---

## 📄 License

[Your License Here - e.g., MIT]

---

## 🙋 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/your-org/lead-forward-platform/issues).

---

**Built with ❤️ for the NGO community**
