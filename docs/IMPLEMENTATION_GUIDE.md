# Google OAuth 2.0 Implementation Guide

Complete guide to the Google OAuth authentication system implementation for the Lead Forward Platform.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Component Breakdown](#component-breakdown)
4. [Setup Instructions](#setup-instructions)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Quick Start

### Prerequisites
- Google Cloud Console account
- Node.js 18+ installed
- npm or yarn package manager

### 1. Set Up Google OAuth
Follow `GOOGLE_OAUTH_SETUP.md` to:
- Create Google Cloud project
- Configure OAuth 2.0 credentials
- Get Client ID and Secret

### 2. Configure Environment
Update `wrangler.json` env.local:
```json
"env": {
  "local": {
    "vars": {
      "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-client-secret",
      "JWT_SECRET": "your-random-secret-key"
    }
  }
}
```

### 3. Run Migrations
```bash
npm run db:migrate
```

### 4. Start Development
```bash
npm run dev
```

### 5. Test Login Flow
- Go to `http://localhost:5173`
- Click "Sign In"
- Sign in with Google account
- Should redirect to home page authenticated

---

## Architecture Overview

### Authentication Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User clicks "Sign In"
       │ GET /api/v1/auth/google/login
       │
       ├─────────────────────────────────┐
       │                                 │
    Frontend                         Backend
  (React App)                       (Hono Worker)
       │                                 │
       │ ◄────── OAuth Login URL ─────── │
       │ (with Google Client ID)
       │
       │ 2. Redirect to Google
       ▼ https://accounts.google.com/o/oauth2/v2/auth
   ┌──────────────────┐
   │  Google OAuth    │
   │ Consent Screen   │
   └──────────────────┘
       │
       │ 3. User authenticates
       │ Google redirects
       │
       ▼ /auth/google/callback?code=...
       │
       │ 4. Exchange code for token
       │ GET /api/v1/auth/google/callback
       │
       ├─────────────────────────────────┐
       │                                 │
       │                    • Exchange code with Google
       │                    • Fetch user profile
       │                    • Create/link user
       │                    • Generate JWT
       │
       │ ◄────── { token, user } ─────── │
       │
       │ 5. Store JWT in localStorage
       │ Update AuthContext
       │
       ▼ Redirect to home page
   ┌──────────────────┐
   │   Authenticated  │
   │  Home Page       │
   └──────────────────┘
       │
       │ 6. All subsequent requests include JWT
       │ Authorization: Bearer <token>
       │
       ├─────────────────────────────────┐
       │                                 │
       │                    • Validate JWT
       │                    • Extract user ID
       │                    • Process request
       │
       ▼ ◄─────── Protected Response ──── │
```

### Key Components

| Component | Location | Responsibility |
|-----------|----------|-----------------|
| **JWT Utilities** | `src/worker/auth/jwt.ts` | Create & verify JWT tokens |
| **OAuth Handler** | `src/worker/auth/google.ts` | Google OAuth flow |
| **Auth Middleware** | `src/worker/auth/middleware.ts` | Token validation |
| **Auth Context** | `src/react-app/context/AuthContext.tsx` | Frontend state management |
| **Protected Route** | `src/react-app/components/ProtectedRoute.tsx` | Route access control |
| **Login Page** | `src/react-app/pages/LoginPage.tsx` | Login UI |
| **Callback Handler** | `src/react-app/pages/OAuthCallbackPage.tsx` | OAuth redirect handling |

---

## Component Breakdown

### Backend Components

#### 1. JWT Utilities (`src/worker/auth/jwt.ts`)
**Exports:**
- `createToken(payload, secret, expirationHours)` - Generate JWT
- `verifyToken(token, secret)` - Verify & decode JWT
- `extractTokenFromHeader(authHeader)` - Parse Bearer token

**Example Usage:**
```typescript
import { createToken, verifyToken } from './auth/jwt';

// Create token
const token = await createToken({
  userId: 'user-123',
  email: 'user@example.com',
  name: 'John Doe'
}, jwtSecret);

// Verify token
const payload = await verifyToken(token, jwtSecret);
console.log(payload.userId); // 'user-123'
```

#### 2. OAuth Handler (`src/worker/auth/google.ts`)
**Exports:**
- `getGoogleLoginUrl()` - Generate OAuth login URL
- `exchangeGoogleCode()` - Exchange authorization code for token
- `getGoogleUserProfile()` - Fetch user profile from Google
- `findOrCreateUserFromGoogle()` - Create or link user account
- `createAuthPayload()` - Convert user to auth payload

**Key Features:**
- Automatic user creation on first login
- Email linking for returning users
- Google ID storage for account linking

#### 3. Auth Middleware (`src/worker/auth/middleware.ts`)
**Exports:**
- `authMiddleware` - Extracts & validates JWT on all routes
- `requireAuth` - Guards that enforce authentication

**Example Usage:**
```typescript
app.use(authMiddleware); // Apply to all routes

// Protected route
app.get('/api/v1/protected', requireAuth, (c) => {
  const user = c.get('user'); // AuthPayload
  return c.json({ message: `Hello ${user.name}` });
});
```

### Frontend Components

#### 1. Auth Context (`src/react-app/context/AuthContext.tsx`)
**Provides:**
- `user` - Current user object
- `token` - JWT token
- `isAuthenticated` - Boolean auth status
- `isLoading` - Loading state
- `login(token, user)` - Set auth state
- `logout()` - Clear auth state
- `getUser()` - Fetch current user

**Example Usage:**
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Not logged in</p>;
  }

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

#### 2. Protected Route (`src/react-app/components/ProtectedRoute.tsx`)
**Wraps components that require authentication.**

```typescript
import { ProtectedRoute } from '../components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <MatchesList />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

#### 3. Login Page (`src/react-app/pages/LoginPage.tsx`)
**Features:**
- "Sign in with Google" button
- Beautiful gradient design
- Error handling
- Loading state

#### 4. OAuth Callback (`src/react-app/pages/OAuthCallbackPage.tsx`)
**Responsibilities:**
- Handles OAuth redirect with authorization code
- Exchanges code for JWT token
- Stores token in localStorage
- Updates auth context
- Redirects to home page

---

## Setup Instructions

### Step 1: Google Cloud Console Setup
See `GOOGLE_OAUTH_SETUP.md` for detailed instructions.

**Quick checklist:**
- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Configure consent screen
- [ ] Add authorized redirect URIs
- [ ] Copy Client ID and Secret

### Step 2: Environment Configuration

**Local Development** (`wrangler.json`):
```json
{
  "env": {
    "local": {
      "vars": {
        "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "JWT_SECRET": "dev-secret-key"
      }
    }
  }
}
```

**Generate Random JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Database Migration
```bash
npm run db:migrate
```

This runs `migrations/0002_add_google_oauth.sql` which adds the `google_id` column to the users table.

### Step 4: Install Dependencies
The implementation uses `jose` for JWT handling:
```bash
npm install jose
```

(Already included in `package.json` if not already there)

### Step 5: Start Development Server
```bash
npm run dev
```

Server will start at `http://localhost:5173`

---

## Development Workflow

### Common Development Tasks

#### Adding a Protected Route
```typescript
// 1. Create your page component
// src/react-app/pages/MyPage.tsx
export function MyPage() {
  const { user } = useAuth();
  return <div>Protected content for {user.name}</div>;
}

// 2. Add to routes with ProtectedRoute wrapper
// src/react-app/App.tsx
import { MyPage } from './pages/MyPage';
import { ProtectedRoute } from './components/ProtectedRoute';

<Route
  path="/my-page"
  element={
    <ProtectedRoute>
      <MyPage />
    </ProtectedRoute>
  }
/>
```

#### Accessing Current User
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return <p>User: {user.email}</p>;
}
```

#### Making Authenticated API Calls
The API client automatically attaches JWT tokens:
```typescript
import { apiGet, apiPost } from '../services/apiClient';

// Token is automatically attached to Authorization header
const data = await apiGet('/api/v1/matches');
const result = await apiPost('/api/v1/matches', { matchData });
```

#### Logout Functionality
```typescript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
```

#### Checking Auth State in Backend Route
```typescript
app.get('/api/v1/protected', requireAuth, async (c) => {
  const user = c.get('user'); // AuthPayload from middleware
  const db = c.env.platform_db;

  // Access user data
  const userData = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.userId)
    .first();

  return c.json({ user: userData });
});
```

---

## Testing

### Run Tests
```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Backend auth tests only
npm run test:watch -- --project=worker src/worker/__tests__/auth.test.ts

# Frontend auth tests only
npm run test:watch -- --project=react src/react-app/__tests__/auth.test.tsx

# Coverage report
npm run test:coverage
```

### Test Coverage
- **38 total tests**: 20 backend + 18 frontend
- See `AUTH_TESTS_SUMMARY.md` for detailed test breakdown

### Key Test Scenarios
- ✅ JWT token creation and verification
- ✅ Token expiration handling
- ✅ Protected route access control
- ✅ Login/logout flows
- ✅ Token persistence
- ✅ Error handling (401, network errors)
- ✅ User profile creation and linking

---

## Troubleshooting

### "Google OAuth is not configured" Error
**Problem**: Backend returns 500 with this message

**Solution**:
1. Check `wrangler.json` has GOOGLE_CLIENT_ID set
2. Restart dev server: `npm run dev`
3. Verify `env.local` section has `vars` object

### "Redirect URI mismatch" Error from Google
**Problem**: OAuth redirect fails with redirect_uri_mismatch

**Solution**:
1. Go to Google Cloud Console
2. Check authorized redirect URIs
3. Must match exactly: `http://localhost:5173/auth/google/callback`
4. Add both localhost variants if testing on different ports

### Token Not Persisting After Refresh
**Problem**: User gets logged out after page refresh

**Solution**:
1. Check browser localStorage allows storage
2. Verify `/api/v1/auth/me` endpoint is working
3. Check JWT token not expired (default 7 days)
4. Check backend is validating token correctly

### 401 Unauthorized on Protected Routes
**Problem**: API calls return 401

**Solution**:
1. Check JWT is in localStorage: `localStorage.getItem('auth_token')`
2. Verify Authorization header is sent: Check network tab
3. Check JWT not expired
4. Verify `authMiddleware` is applied to app

### User Not Created After First Login
**Problem**: No user record in database

**Solution**:
1. Check database migrations ran: `npm run db:schema`
2. Verify `migrations/0002_add_google_oauth.sql` is applied
3. Check backend logs for errors during user creation
4. Verify Google profile fetch succeeded

### "useAuth must be used within an AuthProvider" Error
**Problem**: useAuth called outside AuthProvider

**Solution**:
1. Ensure AuthProvider wraps entire app
2. Check App.tsx has `<AuthProvider>` wrapper
3. Verify component hierarchy: AuthProvider → Router → Routes

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Run full test suite: `npm run test`
- [ ] Check build: `npm run build`
- [ ] No TypeScript errors: `npm run check`
- [ ] Google OAuth credentials created for production domain
- [ ] Production redirect URI added to Google Console
- [ ] Secrets stored in Cloudflare (not in code)

### Setting Production Secrets

```bash
# Set secrets for production
wrangler secret put GOOGLE_CLIENT_ID
# Paste production Client ID

wrangler secret put GOOGLE_CLIENT_SECRET
# Paste production Client Secret

wrangler secret put JWT_SECRET
# Paste strong random JWT secret
```

### Deployment Steps

```bash
# Build production bundle
npm run build

# Deploy to Cloudflare
npm run deploy

# Monitor logs
npx wrangler tail
```

### Production Security Checklist

- [ ] HTTPS enforced (Cloudflare default)
- [ ] Strong JWT_SECRET (32+ characters, random)
- [ ] Secrets stored in Cloudflare Secrets (not env vars)
- [ ] Production Google OAuth credentials
- [ ] Rate limiting on auth endpoints (optional)
- [ ] Error logging enabled
- [ ] Database backups enabled

### Production URLs

Update Google OAuth redirect URIs:
```
Production: https://yourdomain.com/auth/google/callback
```

---

## Key Files Reference

### Backend
- `src/worker/auth/jwt.ts` - JWT token handling
- `src/worker/auth/google.ts` - Google OAuth flow
- `src/worker/auth/middleware.ts` - Auth middleware
- `src/worker/index.ts` - OAuth routes
- `src/types/user.ts` - User & AuthPayload types

### Frontend
- `src/react-app/context/AuthContext.tsx` - Auth state
- `src/react-app/pages/LoginPage.tsx` - Login UI
- `src/react-app/pages/OAuthCallbackPage.tsx` - OAuth callback
- `src/react-app/components/ProtectedRoute.tsx` - Route protection
- `src/react-app/services/apiClient.ts` - API client with JWT

### Database
- `migrations/0001_create_users_table.sql` - Initial schema
- `migrations/0002_add_google_oauth.sql` - OAuth support

### Tests
- `src/worker/__tests__/auth.test.ts` - Backend auth tests
- `src/react-app/__tests__/auth.test.tsx` - Frontend auth tests

### Documentation
- `GOOGLE_OAUTH_SETUP.md` - Setup guide
- `CLAUDE.md` - Full architecture documentation
- `AUTH_TESTS_SUMMARY.md` - Test coverage summary
- `IMPLEMENTATION_GUIDE.md` - This file

---

## Support & Debugging

### Enable Debug Logging
```typescript
// In browser console for frontend debugging
localStorage.setItem('debug', '*');

// Check auth state
import { useAuth } from './context/AuthContext';
const auth = useAuth();
console.log(auth);
```

### Check Database State
```bash
# View schema
npm run db:schema

# Check users table
# (Requires raw D1 access or adding debug endpoint)
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Google OAuth is not configured` | Missing CLIENT_ID | Check wrangler.json |
| `Redirect URI mismatch` | Wrong callback URL | Update Google Console |
| `Invalid or expired token` | JWT verification failed | Check JWT_SECRET matches |
| `useAuth outside provider` | Missing AuthProvider | Wrap app with AuthProvider |
| `401 Unauthorized` | Missing/invalid token | Check localStorage & headers |

---

## Next Steps

1. **Customize Auth UI** - Update LoginPage styling
2. **Add Social Features** - Allow OAuth with other providers
3. **Implement Email Verification** - Add email verification flow
4. **Add Rate Limiting** - Prevent brute force attacks
5. **Set Up Monitoring** - Track auth metrics and errors
6. **User Profiles** - Allow users to edit profile after signup

---

**Last Updated**: October 2024
**Status**: Production Ready
**Maintainer**: Lead Forward Development Team
